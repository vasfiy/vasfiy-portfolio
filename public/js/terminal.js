/* ============================================================
   WebTerm — brauzerda ishlaydigan Linux terminal simulyatori
   Virtual FS + quvurlar (|) + keng buyruqlar to'plami + nano muharriri.
   Bu o'quv qutisi (sandbox): hech narsa brauzerdan chiqmaydi.
   API: window.WebTerm.init(rootEl), window.WebTerm.run(cmd)
   ============================================================ */
(function () {
  "use strict";

  const USER = "kamoliddin";
  const HOST = "kali-lab";
  const HOME = ["home", "kamoliddin"];

  /* ---------- Virtual filesystem ---------- */
  function dir(children) { return { type: "dir", children: children || {}, mode: "755" }; }
  function file(content, mode) { return { type: "file", content: content, mode: mode || "644" }; }

  const FS = dir({
    home: dir({
      kamoliddin: dir({
        "welcome.txt": file(
          "Welcome to the Linux & Cybersecurity Lab!\n" +
          "A safe, simulated shell — experiment freely.\n\n" +
          "New here? Try:  ls -la   tree   cat notes/linux-basics.md\n" +
          "Pipes work too: cat data/ports.csv | sort | head -3\n" +
          "Edit a file:    nano scratch.txt\n" +
          "Type 'help' for the full command list.\n"),
        "notes": dir({
          "linux-basics.md": file(
            "# Linux basics\n\n" +
            "pwd  - print working directory\n" +
            "ls   - list files\n" +
            "cd   - change directory\n" +
            "cat  - print a file\n" +
            "grep - search inside files\n\n" +
            "Everything in linux is a file.\n"),
          "networking.md": file(
            "# Networking notes\n\nCommon ports:\n  22  SSH\n  53  DNS\n  80  HTTP\n  443 HTTPS\n\nTCP handshake: SYN -> SYN/ACK -> ACK\n")
        }),
        "labs": dir({
          "cia-triad.txt": file("CIA Triad\n=========\nConfidentiality - keep data secret\nIntegrity       - keep data correct\nAvailability    - keep data reachable\n"),
          "lab01.txt": file("Lab 01: find the flag.\nHint: some files start with a dot.\n")
        }),
        "data": dir({
          "ports.csv": file("port,service\n443,https\n22,ssh\n80,http\n53,dns\n22,ssh\n3306,mysql\n80,http\n"),
          "names.txt": file("alice\nbob\ncharlie\nbob\nalice\ndave\n")
        }),
        "scratch.txt": file("edit me with: nano scratch.txt\n"),
        ".secret": file("flag{you_found_a_hidden_file}\n"),
        ".bashrc": file("export PS1='\\u@\\h:\\w$ '\nalias ll='ls -la'\nalias ..='cd ..'\n")
      })
    }),
    etc: dir({
      hostname: file(HOST + "\n"),
      "os-release": file('NAME="WebTerm Linux"\nVERSION="1.0 (sandbox)"\n'),
      passwd: file("root:x:0:0:root:/root:/bin/bash\n" + USER + ":x:1000:1000::/home/" + USER + ":/bin/bash\n")
    }),
    var: dir({ log: dir({
      "auth.log": file(
        "Jun 18 09:01:22 kali-lab sshd[1201]: Accepted password for kamoliddin from 10.0.0.5 port 51514\n" +
        "Jun 18 09:14:03 kali-lab sshd[1233]: Failed password for root from 185.23.4.9 port 40122\n" +
        "Jun 18 09:14:07 kali-lab sshd[1233]: Failed password for root from 185.23.4.9 port 40124\n" +
        "Jun 18 09:15:55 kali-lab sudo: kamoliddin : COMMAND=/usr/bin/apt update\n")
    }) })
  });

  let cwd = HOME.slice();
  const history = [];
  let histIdx = -1;
  const aliases = { ll: "ls -la", la: "ls -a", "..": "cd ..", l: "ls" };
  const env = { USER, HOME: "/home/" + USER, HOSTNAME: HOST, SHELL: "/bin/bash", PWD: "/home/" + USER, PATH: "/usr/local/bin:/usr/bin:/bin", LANG: "en_US.UTF-8", TERM: "xterm-256color" };
  let outEl, inEl, promptEl, rootRef;

  /* Snapshot of pristine state (for `reset`) */
  const DEFAULT = JSON.stringify({ fs: FS.children, aliases, env });

  /* ---------- Session persistence (localStorage via KTStore) ---------- */
  function saveSession() {
    if (!window.KTStore) return;
    KTStore.set("term", { fs: FS.children, cwd, history, aliases, env });
  }
  function loadSession() {
    if (!window.KTStore) return;
    const s = KTStore.get("term", null);
    if (!s || !s.fs) return;
    FS.children = s.fs;
    cwd = Array.isArray(s.cwd) ? s.cwd : HOME.slice();
    if (getNode(cwd) == null) cwd = HOME.slice();
    history.length = 0; (s.history || []).forEach((h) => history.push(h)); histIdx = history.length;
    Object.keys(aliases).forEach((k) => delete aliases[k]); Object.assign(aliases, s.aliases || {});
    Object.assign(env, s.env || {});
  }
  function resetSession() {
    const d = JSON.parse(DEFAULT);
    FS.children = d.fs;
    cwd = HOME.slice();
    history.length = 0; histIdx = 0;
    Object.keys(aliases).forEach((k) => delete aliases[k]); Object.assign(aliases, d.aliases);
    Object.keys(env).forEach((k) => delete env[k]); Object.assign(env, d.env);
    if (window.KTStore) KTStore.remove("term");
  }

  /* ---------- Path helpers ---------- */
  function normalize(input) {
    let parts;
    if (input.startsWith("/")) parts = input.split("/");
    else if (input === "~" || input.startsWith("~/")) parts = HOME.concat(input.slice(1).split("/"));
    else parts = cwd.concat(input.split("/"));
    const stack = [];
    for (const p of parts) {
      if (p === "" || p === ".") continue;
      if (p === "..") { stack.pop(); continue; }
      stack.push(p);
    }
    return stack;
  }
  function getNode(pathArr) {
    let node = FS;
    for (const name of pathArr) {
      if (node.type !== "dir" || !node.children[name]) return null;
      node = node.children[name];
    }
    return node;
  }
  function parentOf(pathArr) { return getNode(pathArr.slice(0, -1)); }
  function baseName(pathArr) { return pathArr[pathArr.length - 1]; }
  function pathStr(pathArr) {
    if (pathArr.length >= 2 && pathArr[0] === HOME[0] && pathArr[1] === HOME[1]) {
      const rest = pathArr.slice(2);
      return "~" + (rest.length ? "/" + rest.join("/") : "");
    }
    return "/" + pathArr.join("/");
  }

  /* ---------- Output helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function R(text, html) { return { text: text == null ? "" : text, html: html || null }; }
  function ERR(msg) { return { text: msg, html: `<span class="term-err">${esc(msg)}</span>`, error: true }; }
  function asResult(v) { return v == null ? R("") : (typeof v === "string" ? R(v) : v); }
  function htmlFromText(t) { return esc(t).replace(/\n/g, "<br>"); }

  function print(html) {
    const div = document.createElement("div");
    div.className = "term-line";
    div.innerHTML = html;
    outEl.appendChild(div);
    if (rootRef) rootRef.scrollTop = rootRef.scrollHeight;
  }
  function updatePrompt() {
    env.PWD = "/" + cwd.join("/");
    promptEl.textContent = `${USER}@${HOST}:${pathStr(cwd)}$`;
  }

  /* read input for a filter: file arg OR stdin */
  function readInput(args, stdin, name) {
    const fileArg = args.find((a) => !a.startsWith("-"));
    if (fileArg) {
      const n = getNode(normalize(fileArg));
      if (!n) return { err: `${name}: ${fileArg}: No such file or directory` };
      if (n.type !== "file") return { err: `${name}: ${fileArg}: Is a directory` };
      return { content: n.content };
    }
    return { content: stdin == null ? "" : stdin };
  }
  function lines(s) { return s.replace(/\n$/, "").split("\n"); }

  /* ---------- Manual ---------- */
  const MAN = {
    help: "list available commands", pwd: "print working directory", ls: "list directory contents (-a -l)",
    cd: "change directory", cat: "concatenate and print files", tac: "print files in reverse line order",
    echo: "display a line of text", clear: "clear the terminal screen", tree: "display directories as a tree",
    file: "determine file type", stat: "display file status", cp: "copy files", mv: "move/rename files",
    rm: "remove files (-r for dirs)", mkdir: "make directories", rmdir: "remove empty directories",
    touch: "create empty file / update timestamp", ln: "make links", find: "search for files (-name)",
    du: "estimate file space usage", df: "report filesystem disk space", grep: "print lines matching a pattern",
    head: "output the first part of files (-n)", tail: "output the last part of files (-n)",
    wc: "count lines, words, bytes", sort: "sort lines (-r -n -u)", uniq: "report or omit repeated lines (-c)",
    cut: "remove sections from lines (-d -f -c)", tr: "translate or delete characters", rev: "reverse lines",
    nl: "number lines", sed: "stream editor (s/old/new/ supported)", tee: "read stdin, write to file and stdout",
    seq: "print a sequence of numbers", printf: "format and print data", xargs: "build command from stdin",
    whoami: "print effective user", id: "print user and group IDs", groups: "print group memberships",
    hostname: "show system hostname", uname: "print system info (-a)", date: "print date and time",
    cal: "display a calendar", uptime: "show how long the system has run", free: "display memory usage",
    ps: "report process status", top: "display processes", jobs: "list active jobs", kill: "send a signal",
    env: "print the environment", printenv: "print environment variables", export: "set an env var",
    set: "show shell variables", alias: "define or show aliases", unalias: "remove an alias",
    type: "show how a name is interpreted", which: "locate a command", whatis: "one-line manual lookup",
    history: "command history", chmod: "change file mode (simulated)", chown: "change owner (simulated)",
    umask: "set file creation mask", sudo: "execute as superuser", su: "switch user",
    passwd: "change password", ping: "test reachability (simulated)", ifconfig: "configure interface (simulated)",
    ip: "show ip addresses (simulated)", netstat: "network connections (simulated)",
    wget: "download files (simulated)", curl: "transfer a URL (simulated)", ssh: "secure shell (simulated)",
    apt: "package manager (simulated)", tar: "archive files (simulated)", gzip: "compress (simulated)",
    gunzip: "decompress (simulated)", nano: "simple text editor", vi: "text editor (opens nano)",
    vim: "text editor (opens nano)", less: "page through a file", more: "page through a file",
    man: "show a short manual page", neofetch: "system info banner", cowsay: "a cow says something",
    reset: "reset the sandbox (files, history) to defaults", exit: "close (clears the screen)"
  };

  /* ---------- Commands ---------- */
  const C = {};

  C.help = () => {
    const names = Object.keys(C).sort();
    return R("Available commands:\n" + names.join("  "),
      `Available commands <span class="term-dim">(learning sandbox — pipes with | work too)</span>:<br><br>` +
      names.map((n) => `<span class="term-cmd">${n}</span>`).join("  ") +
      `<br><br>Type <span class="term-cmd">man &lt;cmd&gt;</span> for a description.`);
  };
  C.pwd = () => R("/" + cwd.join("/"));
  C.whoami = () => R(USER);
  C.id = () => R(`uid=1000(${USER}) gid=1000(${USER}) groups=1000(${USER}),27(sudo)`);
  C.groups = () => R(`${USER} sudo`);
  C.hostname = () => R(HOST);
  C.date = () => R(new Date().toString());
  C.cal = () => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const title = now.toLocaleString("en-US", { month: "long" }) + " " + y;
    let out = title.padStart(Math.floor((20 + title.length) / 2)).padEnd(20) + "\nSu Mo Tu We Th Fr Sa\n";
    let row = "   ".repeat(first);
    for (let d = 1; d <= days; d++) {
      row += String(d).padStart(2) + " ";
      if ((first + d) % 7 === 0) { out += row.trimEnd() + "\n"; row = ""; }
    }
    if (row.trim()) out += row.trimEnd() + "\n";
    return R(out);
  };
  C.uptime = () => R(` ${new Date().toTimeString().slice(0, 8)} up 3:14, 1 user, load average: 0.08, 0.03, 0.01`);
  C.free = () => R("              total        used        free\nMem:        8127044     3120488     5006556\nSwap:       2097148           0     2097148");
  C.ps = () => R("  PID TTY          TIME CMD\n 1024 pts/0    00:00:00 bash\n 1337 pts/0    00:00:00 ps");
  C.top = () => R("top - sandbox\nTasks: 2 total\n  PID USER      %CPU %MEM COMMAND\n 1024 " + USER + "   0.0  0.1 bash\n 1337 " + USER + "   0.0  0.1 webterm");
  C.jobs = () => R("");
  C.kill = (a) => a.length ? R("") : ERR("kill: usage: kill [-s signal] pid");
  C.uname = (a) => R(a.includes("-a") ? "Linux kali-lab 6.8.0-webterm #1 SMP x86_64 GNU/Linux" : "Linux");
  C.history = () => R(history.map((h, i) => `  ${i + 1}  ${h}`).join("\n"),
    history.map((h, i) => `  ${i + 1}  ${esc(h)}`).join("<br>"));
  C.echo = (a) => R(a.join(" ").replace(/\$(\w+)/g, (m, k) => env[k] != null ? env[k] : ""));
  C.clear = () => { outEl.innerHTML = ""; return R(""); };
  C.exit = () => { outEl.innerHTML = ""; return R(""); };

  C.env = () => R(Object.keys(env).map((k) => `${k}=${env[k]}`).join("\n"));
  C.printenv = (a) => a[0] ? R(env[a[0]] != null ? env[a[0]] : "") : C.env();
  C.set = () => C.env();
  C.export = (a) => { a.forEach((p) => { const i = p.indexOf("="); if (i > 0) env[p.slice(0, i)] = p.slice(i + 1); }); return R(""); };
  C.alias = (a) => {
    if (!a.length) return R(Object.keys(aliases).map((k) => `alias ${k}='${aliases[k]}'`).join("\n"));
    const raw = a.join(" "); const i = raw.indexOf("=");
    if (i > 0) { aliases[raw.slice(0, i)] = raw.slice(i + 1).replace(/^['"]|['"]$/g, ""); return R(""); }
    return aliases[a[0]] ? R(`alias ${a[0]}='${aliases[a[0]]}'`) : ERR(`alias: ${a[0]}: not found`);
  };
  C.unalias = (a) => { delete aliases[a[0]]; return R(""); };
  C.type = (a) => {
    const n = a[0];
    if (aliases[n]) return R(`${n} is aliased to \`${aliases[n]}'`);
    if (C[n]) return R(`${n} is a shell builtin`);
    return ERR(`type: ${n}: not found`);
  };
  C.which = (a) => C[a[0]] ? R(`/usr/bin/${a[0]}`) : R("");
  C.whatis = (a) => MAN[a[0]] ? R(`${a[0]} (1) - ${MAN[a[0]]}`) : ERR(`${a[0]}: nothing appropriate.`);

  C.ls = (args) => {
    const flags = args.filter((a) => a.startsWith("-")).join("");
    const targets = args.filter((a) => !a.startsWith("-"));
    const showAll = flags.includes("a"), long = flags.includes("l");
    const p = targets.length ? normalize(targets[0]) : cwd;
    const node = getNode(p);
    if (!node) return ERR(`ls: cannot access '${targets[0]}': No such file or directory`);
    if (node.type === "file") return R(targets[0]);
    let names = Object.keys(node.children);
    if (!showAll) names = names.filter((n) => !n.startsWith("."));
    else names = [".", ".."].concat(names);
    names.sort();
    if (!names.length) return R("");
    const plain = names.join(long ? "\n" : "  ");
    const html = names.map((n) => {
      const child = (n === "." || n === "..") ? { type: "dir", mode: "755" } : node.children[n];
      const cls = child.type === "dir" ? "term-dir" : "term-file";
      const slash = child.type === "dir" && n !== "." && n !== ".." ? "/" : "";
      const cell = `<span class="${cls}">${esc(n)}${slash}</span>`;
      return long ? `${child.type === "dir" ? "d" : "-"}${permStr(child.mode)}  ${USER} ${USER}  ${cell}` : cell;
    }).join(long ? "<br>" : "&nbsp;&nbsp;&nbsp;");
    return R(plain, html);
  };
  function permStr(mode) {
    const m = { "0": "---", "1": "--x", "2": "-w-", "3": "-wx", "4": "r--", "5": "r-x", "6": "rw-", "7": "rwx" };
    return (mode || "644").split("").map((d) => m[d] || "---").join("");
  }

  C.cd = (a) => {
    const target = a[0] || "~";
    const p = normalize(target);
    const node = getNode(p);
    if (!node) return ERR(`cd: ${target}: No such file or directory`);
    if (node.type !== "dir") return ERR(`cd: ${target}: Not a directory`);
    cwd = p; updatePrompt(); return R("");
  };

  C.cat = (a, stdin) => {
    if (!a.length) return R(stdin == null ? "" : stdin);
    let out = "", err = false;
    a.filter((x) => !x.startsWith("-")).forEach((f) => {
      const n = getNode(normalize(f));
      if (!n) { out += `cat: ${f}: No such file or directory\n`; err = true; }
      else if (n.type === "dir") { out += `cat: ${f}: Is a directory\n`; err = true; }
      else out += n.content;
    });
    return err ? ERR(out.replace(/\n$/, "")) : R(out);
  };
  C.tac = (a, stdin) => {
    const inp = readInput(a, stdin, "tac"); if (inp.err) return ERR(inp.err);
    return R(lines(inp.content).reverse().join("\n"));
  };

  C.head = (a, stdin) => firstLast(a, stdin, "head", true);
  C.tail = (a, stdin) => firstLast(a, stdin, "tail", false);
  function firstLast(args, stdin, name, first) {
    let n = 10; const ni = args.indexOf("-n");
    if (ni >= 0 && args[ni + 1]) n = parseInt(args[ni + 1], 10) || 10;
    const m = args.join(" ").match(/-(\d+)/); if (m) n = parseInt(m[1], 10);
    const fileArgs = args.filter((a, i) => !a.startsWith("-") && a !== args[ni + 1] || (ni < 0 && !a.startsWith("-")));
    const inp = readInput(fileArgs.filter((x) => !/^\d+$/.test(x)), stdin, name);
    if (inp.err) return ERR(inp.err);
    const L = lines(inp.content);
    return R((first ? L.slice(0, n) : L.slice(-n)).join("\n"));
  }

  C.wc = (a, stdin) => {
    const flags = a.filter((x) => x.startsWith("-")).join("");
    const inp = readInput(a, stdin, "wc"); if (inp.err) return ERR(inp.err);
    const c = inp.content;
    const l = c === "" ? 0 : c.replace(/\n$/, "").split("\n").length;
    const w = c.split(/\s+/).filter(Boolean).length;
    const fileArg = a.find((x) => !x.startsWith("-")) || "";
    if (flags.includes("l")) return R(`${l} ${fileArg}`.trim());
    if (flags.includes("w")) return R(`${w} ${fileArg}`.trim());
    if (flags.includes("c")) return R(`${c.length} ${fileArg}`.trim());
    return R(`${String(l).padStart(7)} ${String(w).padStart(7)} ${String(c.length).padStart(7)} ${fileArg}`.trimEnd());
  };

  C.grep = (a, stdin) => {
    const flags = a.filter((x) => x.startsWith("-")).join("");
    const rest = a.filter((x) => !x.startsWith("-"));
    const pat = rest[0];
    if (pat == null) return ERR("usage: grep PATTERN [FILE]");
    const inp = readInput(rest.slice(1), stdin, "grep");
    if (inp.err) return ERR(inp.err);
    const ic = flags.includes("i");
    let re;
    try { re = new RegExp(pat, ic ? "i" : ""); } catch (e) { re = null; }
    const test = (l) => re ? re.test(l) : l.toLowerCase().includes(pat.toLowerCase());
    let matched = lines(inp.content).filter((l) => { const t = test(l); return flags.includes("v") ? !t : t; });
    if (flags.includes("c")) return R(String(matched.length));
    const plain = matched.join("\n");
    const safePat = pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const html = matched.map((l) => esc(l).replace(new RegExp("(" + safePat + ")", ic ? "ig" : "g"),
      '<span class="term-match">$1</span>')).join("<br>");
    return R(plain, html || (plain ? null : ""));
  };
  C.egrep = C.grep;

  C.sort = (a, stdin) => {
    const flags = a.filter((x) => x.startsWith("-")).join("");
    const inp = readInput(a, stdin, "sort"); if (inp.err) return ERR(inp.err);
    let L = lines(inp.content);
    L.sort((x, y) => flags.includes("n") ? (parseFloat(x) || 0) - (parseFloat(y) || 0) : x.localeCompare(y));
    if (flags.includes("r")) L.reverse();
    if (flags.includes("u")) L = L.filter((v, i) => i === 0 || v !== L[i - 1]);
    return R(L.join("\n"));
  };
  C.uniq = (a, stdin) => {
    const flags = a.filter((x) => x.startsWith("-")).join("");
    const inp = readInput(a, stdin, "uniq"); if (inp.err) return ERR(inp.err);
    const L = lines(inp.content); const out = [];
    for (let i = 0; i < L.length; i++) {
      let count = 1; while (i + 1 < L.length && L[i + 1] === L[i]) { count++; i++; }
      out.push(flags.includes("c") ? `${String(count).padStart(7)} ${L[i]}` : L[i]);
    }
    return R(out.join("\n"));
  };
  C.cut = (a, stdin) => {
    const inp = readInput(a, stdin, "cut"); if (inp.err) return ERR(inp.err);
    let delim = "\t"; const di = a.indexOf("-d"); if (di >= 0 && a[di + 1] != null) delim = a[di + 1];
    a.forEach((x) => { if (x.startsWith("-d")) delim = x.slice(2) || delim; });
    let fields = null, chars = null;
    a.forEach((x) => { if (x.startsWith("-f")) fields = x.slice(2); if (x.startsWith("-c")) chars = x.slice(2); });
    const fi = a.indexOf("-f"); if (fi >= 0 && a[fi + 1]) fields = a[fi + 1];
    const ci = a.indexOf("-c"); if (ci >= 0 && a[ci + 1]) chars = a[ci + 1];
    delim = delim.replace(/^['"]|['"]$/g, "");
    const pick = (spec, arr) => {
      const out = [];
      spec.split(",").forEach((part) => {
        const rg = part.split("-");
        if (rg.length === 2) { const s = +rg[0] || 1, e = +rg[1] || arr.length; for (let k = s; k <= e; k++) if (arr[k - 1] != null) out.push(arr[k - 1]); }
        else if (arr[+part - 1] != null) out.push(arr[+part - 1]);
      });
      return out;
    };
    const res = lines(inp.content).map((l) => {
      if (chars) return pick(chars, l.split("")).join("");
      return pick(fields || "1", l.split(delim)).join(delim);
    });
    return R(res.join("\n"));
  };
  function expandSet(s) {
    let out = "";
    for (let i = 0; i < s.length; i++) {
      if (s[i + 1] === "-" && s[i + 2] != null) { for (let c = s.charCodeAt(i); c <= s.charCodeAt(i + 2); c++) out += String.fromCharCode(c); i += 2; }
      else out += s[i];
    }
    return out;
  }
  C.tr = (a, stdin) => {
    const sets = a.filter((x) => !x.startsWith("-")).map((s) => s.replace(/^['"]|['"]$/g, ""));
    const del = a.includes("-d");
    const inp = stdin == null ? "" : stdin;
    if (del && sets[0]) { const re = new RegExp("[" + expandSet(sets[0]).replace(/[\]\\^-]/g, "\\$&") + "]", "g"); return R(inp.replace(re, "")); }
    if (sets.length < 2) return ERR("usage: tr SET1 SET2");
    const s1 = expandSet(sets[0]), s2 = expandSet(sets[1]);
    let out = "";
    for (const ch of inp) { const idx = s1.indexOf(ch); out += idx >= 0 ? (s2[idx] || s2[s2.length - 1]) : ch; }
    return R(out);
  };
  C.rev = (a, stdin) => {
    const inp = readInput(a, stdin, "rev"); if (inp.err) return ERR(inp.err);
    return R(lines(inp.content).map((l) => l.split("").reverse().join("")).join("\n"));
  };
  C.nl = (a, stdin) => {
    const inp = readInput(a, stdin, "nl"); if (inp.err) return ERR(inp.err);
    let i = 0;
    return R(lines(inp.content).map((l) => l.trim() === "" ? "      " + l : `${String(++i).padStart(6)}\t${l}`).join("\n"));
  };
  C.sed = (a, stdin) => {
    const script = a.find((x) => !x.startsWith("-")) || "";
    const m = script.replace(/^['"]|['"]$/g, "").match(/^s\/((?:\\.|[^/])*)\/((?:\\.|[^/])*)\/(g?i?)$/);
    const inp = readInput(a.slice(a.indexOf(script) + 1), stdin, "sed");
    if (inp.err) return ERR(inp.err);
    if (!m) return ERR("sed: only s/old/new/[g] is supported in this sandbox");
    let flags = ""; if (m[3].includes("g")) flags += "g"; if (m[3].includes("i")) flags += "i";
    let re; try { re = new RegExp(m[1], flags); } catch (e) { return ERR("sed: bad regex"); }
    return R(lines(inp.content).map((l) => l.replace(re, m[2])).join("\n"));
  };
  C.seq = (a) => {
    const n = a.map(Number);
    let s = 1, e = 1, step = 1;
    if (n.length === 1) e = n[0]; else if (n.length === 2) { s = n[0]; e = n[1]; } else if (n.length >= 3) { s = n[0]; step = n[1]; e = n[2]; }
    const out = []; for (let i = s; step > 0 ? i <= e : i >= e; i += step) out.push(i);
    return R(out.join("\n"));
  };
  C.printf = (a) => {
    let fmt = (a[0] || "").replace(/^['"]|['"]$/g, ""); const rest = a.slice(1);
    let i = 0;
    const out = fmt.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/%[sd]/g, () => rest[i++] != null ? rest[i - 1] : "");
    return R(out);
  };
  C.tee = (a, stdin) => {
    const f = a.find((x) => !x.startsWith("-"));
    if (f) { const p = normalize(f); const par = parentOf(p); if (par && par.type === "dir") par.children[baseName(p)] = file(stdin == null ? "" : stdin); }
    return R(stdin == null ? "" : stdin);
  };
  C.xargs = (a, stdin) => {
    const cmd = a[0] || "echo"; const items = (stdin || "").split(/\s+/).filter(Boolean);
    if (!C[cmd]) return ERR(`xargs: ${cmd}: command not found`);
    return asResult(C[cmd](a.slice(1).concat(items)));
  };
  C.fold = (a, stdin) => {
    let w = 80; const wi = a.indexOf("-w"); if (wi >= 0 && a[wi + 1]) w = +a[wi + 1] || 80;
    const inp = readInput(a, stdin, "fold"); if (inp.err) return ERR(inp.err);
    const out = lines(inp.content).map((l) => { const parts = []; for (let i = 0; i < l.length; i += w) parts.push(l.slice(i, i + w)); return parts.join("\n") || ""; });
    return R(out.join("\n"));
  };

  C.tree = () => {
    const out = [], html = [];
    function walk(node, prefix) {
      const names = Object.keys(node.children).filter((n) => !n.startsWith(".")).sort();
      names.forEach((n, i) => {
        const last = i === names.length - 1, child = node.children[n];
        const branch = last ? "└── " : "├── ";
        out.push(prefix + branch + n);
        const cls = child.type === "dir" ? "term-dir" : "term-file";
        html.push(esc(prefix) + branch + `<span class="${cls}">${esc(n)}${child.type === "dir" ? "/" : ""}</span>`);
        if (child.type === "dir") walk(child, prefix + (last ? "    " : "│   "));
      });
    }
    out.push("."); html.push(`<span class="term-dir">.</span>`);
    walk(getNode(cwd), "");
    return R(out.join("\n"), html.join("<br>"));
  };

  C.file = (a) => {
    if (!a[0]) return ERR("file: missing operand");
    const n = getNode(normalize(a[0]));
    if (!n) return ERR(`${a[0]}: cannot open (No such file or directory)`);
    if (n.type === "dir") return R(`${a[0]}: directory`);
    return R(`${a[0]}: ${/^#!|^\s*</.test(n.content) ? "script, ASCII text" : "ASCII text"}`);
  };
  C.stat = (a) => {
    if (!a[0]) return ERR("stat: missing operand");
    const p = normalize(a[0]); const n = getNode(p);
    if (!n) return ERR(`stat: cannot stat '${a[0]}': No such file or directory`);
    const size = n.type === "file" ? n.content.length : 4096;
    return R(`  File: ${a[0]}\n  Size: ${size}\t${n.type === "dir" ? "directory" : "regular file"}\n` +
      `Access: (0${n.mode || "644"}/${n.type === "dir" ? "d" : "-"}${permStr(n.mode)})  Uid: (1000/${USER})  Gid: (1000/${USER})`);
  };

  C.cp = (a) => {
    const t = a.filter((x) => !x.startsWith("-"));
    if (t.length < 2) return ERR("cp: missing destination file operand");
    const src = getNode(normalize(t[0]));
    if (!src) return ERR(`cp: cannot stat '${t[0]}': No such file or directory`);
    const dp = normalize(t[1]); let dpar = parentOf(dp), name = baseName(dp);
    const dnode = getNode(dp);
    if (dnode && dnode.type === "dir") { dpar = dnode; name = baseName(normalize(t[0])); }
    if (!dpar || dpar.type !== "dir") return ERR(`cp: cannot create '${t[1]}'`);
    dpar.children[name] = src.type === "dir" ? JSON.parse(JSON.stringify(src)) : file(src.content, src.mode);
    return R("");
  };
  C.mv = (a) => {
    const t = a.filter((x) => !x.startsWith("-"));
    if (t.length < 2) return ERR("mv: missing destination file operand");
    const sp = normalize(t[0]); const spar = parentOf(sp); const sname = baseName(sp);
    if (!spar || !spar.children[sname]) return ERR(`mv: cannot stat '${t[0]}': No such file or directory`);
    const node = spar.children[sname];
    const dp = normalize(t[1]); let dpar = parentOf(dp), name = baseName(dp);
    const dnode = getNode(dp);
    if (dnode && dnode.type === "dir") { dpar = dnode; name = sname; }
    if (!dpar || dpar.type !== "dir") return ERR(`mv: cannot move to '${t[1]}'`);
    dpar.children[name] = node; delete spar.children[sname];
    return R("");
  };
  C.ln = (a) => {
    const t = a.filter((x) => !x.startsWith("-"));
    if (t.length < 2) return ERR("ln: missing operand");
    return C.cp([t[0], t[1]]);
  };
  C.mkdir = (a) => {
    const t = a.filter((x) => !x.startsWith("-"));
    if (!t[0]) return ERR("mkdir: missing operand");
    for (const x of t) {
      const p = normalize(x), par = parentOf(p), name = baseName(p);
      if (!par || par.type !== "dir") return ERR(`mkdir: cannot create directory '${x}'`);
      if (par.children[name]) return ERR(`mkdir: cannot create directory '${x}': File exists`);
      par.children[name] = dir();
    }
    return R("");
  };
  C.rmdir = (a) => {
    const p = normalize(a[0] || ""), par = parentOf(p), name = baseName(p);
    if (!par || !par.children[name]) return ERR(`rmdir: failed to remove '${a[0]}': No such file or directory`);
    if (par.children[name].type !== "dir") return ERR(`rmdir: failed to remove '${a[0]}': Not a directory`);
    if (Object.keys(par.children[name].children).length) return ERR(`rmdir: failed to remove '${a[0]}': Directory not empty`);
    delete par.children[name]; return R("");
  };
  C.touch = (a) => {
    const t = a.filter((x) => !x.startsWith("-"));
    if (!t[0]) return ERR("touch: missing file operand");
    for (const x of t) {
      const p = normalize(x), par = parentOf(p), name = baseName(p);
      if (!par || par.type !== "dir") return ERR(`touch: cannot touch '${x}'`);
      if (!par.children[name]) par.children[name] = file("");
    }
    return R("");
  };
  C.rm = (a) => {
    const rec = a.some((x) => x.startsWith("-") && (x.includes("r") || x.includes("R")));
    const t = a.filter((x) => !x.startsWith("-"));
    if (!t.length) return ERR("rm: missing operand");
    for (const x of t) {
      const p = normalize(x), par = parentOf(p), name = baseName(p);
      if (!par || !par.children[name]) return ERR(`rm: cannot remove '${x}': No such file or directory`);
      if (par.children[name].type === "dir" && !rec) return ERR(`rm: cannot remove '${x}': Is a directory`);
      delete par.children[name];
    }
    return R("");
  };
  C.find = (a) => {
    const start = (a[0] && !a[0].startsWith("-")) ? a[0] : ".";
    let namePat = null; const ni = a.indexOf("-name"); if (ni >= 0 && a[ni + 1]) namePat = a[ni + 1].replace(/^['"]|['"]$/g, "");
    const re = namePat ? new RegExp("^" + namePat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$") : null;
    const base = normalize(start); const root = getNode(base);
    if (!root) return ERR(`find: '${start}': No such file or directory`);
    const out = [];
    (function walk(node, path) {
      const disp = start === "." ? (path.length ? "./" + path.join("/") : ".") : "/" + path.join("/");
      const nm = path.length ? path[path.length - 1] : start;
      if (!re || re.test(nm) || (path.length === 0 && re.test(start))) out.push(disp);
      if (node.type === "dir") Object.keys(node.children).sort().forEach((c) => walk(node.children[c], path.concat(c)));
    })(root, []);
    return R(out.join("\n"));
  };
  C.du = () => R("4.0K\t./notes\n4.0K\t./labs\n4.0K\t./data\n16K\t.");
  C.df = () => R("Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1       41152000 8231004  30821996  22% /\ntmpfs            4063520       0   4063520   0% /dev/shm");

  C.chmod = (a) => {
    const mode = a.find((x) => /^\d{3,4}$/.test(x));
    const target = a.find((x) => !x.startsWith("-") && x !== mode);
    if (!mode || !target) return ERR("usage: chmod MODE FILE");
    const n = getNode(normalize(target));
    if (!n) return ERR(`chmod: cannot access '${target}': No such file or directory`);
    n.mode = mode.slice(-3); return R("");
  };
  C.chown = (a) => a.length >= 2 ? R("") : ERR("usage: chown OWNER FILE");
  C.umask = (a) => a.length ? R("") : R("0022");
  C.passwd = () => R("Changing password for " + USER + ".\n(simulated — no password is stored)");
  C.sudo = (a) => {
    if (!a.length) return ERR("usage: sudo <command>");
    if (C[a[0]]) return asResult(C[a[0]](a.slice(1)));
    return R(`${USER} is not in the sudoers file. This incident will be reported. 😉`,
      `<span class="term-dim">${USER} is not in the sudoers file. This incident will be reported. 😉</span>`);
  };
  C.su = () => R("Password: \n(simulated — staying as " + USER + ")");

  C.ping = (a) => {
    const host = a.find((x) => !x.startsWith("-")) || "localhost";
    let out = `PING ${host} (127.0.0.1): 56 data bytes\n`;
    for (let i = 0; i < 4; i++) out += `64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${(Math.random() * 0.4 + 0.1).toFixed(3)} ms\n`;
    out += `\n--- ${host} ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss`;
    return R(out, htmlFromText(out) + `<br><span class="term-dim">(simulated — no real network)</span>`);
  };
  C.ifconfig = () => R("eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>\n        inet 10.0.0.5  netmask 255.255.255.0\nlo: flags=73<UP,LOOPBACK,RUNNING>\n        inet 127.0.0.1  netmask 255.0.0.0");
  C.ip = (a) => (a[0] === "a" || a[0] === "addr" || !a.length) ? C.ifconfig() : R("");
  C.netstat = () => R("Active Internet connections\nProto Local Address      Foreign Address    State\ntcp   10.0.0.5:22         185.23.4.9:40122   ESTABLISHED");
  C.wget = (a) => { const u = a.find((x) => !x.startsWith("-")) || ""; return R(`--  ${u}\n(simulated) saved to './index.html'`, `<span class="term-dim">wget ${esc(u)} — simulated, no real network</span>`); };
  C.curl = (a) => { const u = a.find((x) => !x.startsWith("-")) || ""; return R(`<!doctype html><html>... (simulated response from ${u}) ...</html>`, `<span class="term-dim">curl ${esc(u)} — simulated, no real network</span>`); };
  C.ssh = (a) => R(`ssh ${a[0] || ""}: connection simulated — no real network access`, `<span class="term-dim">ssh ${esc(a[0] || "")} — simulated</span>`);

  C.apt = (a) => R(`(simulated) apt ${a.join(" ")}\nReading package lists... Done`, `<span class="term-dim">apt ${esc(a.join(" "))} — simulated package manager</span>`);
  C["apt-get"] = C.apt; C.dnf = C.apt; C.yum = C.apt; C.pip = C.apt;
  C.tar = (a) => R(`(simulated) tar ${a.join(" ")}`, `<span class="term-dim">tar — simulated archiver in this sandbox</span>`);
  C.gzip = (a) => simZip(a, ".gz", "gzip");
  C.gunzip = (a) => simUnzip(a, ".gz", "gunzip");
  C.zip = (a) => R(`(simulated) zip ${a.join(" ")}`, `<span class="term-dim">zip — simulated</span>`);
  function simZip(a, ext, name) {
    const f = a.find((x) => !x.startsWith("-")); if (!f) return ERR(`${name}: missing operand`);
    const p = normalize(f), par = parentOf(p), n = baseName(p);
    if (!par || !par.children[n]) return ERR(`${name}: ${f}: No such file or directory`);
    par.children[n + ext] = par.children[n]; delete par.children[n]; return R("");
  }
  function simUnzip(a, ext, name) {
    const f = a.find((x) => !x.startsWith("-")); if (!f) return ERR(`${name}: missing operand`);
    const p = normalize(f), par = parentOf(p), n = baseName(p);
    if (!par || !par.children[n]) return ERR(`${name}: ${f}: No such file or directory`);
    par.children[n.replace(new RegExp(ext + "$"), "")] = par.children[n]; delete par.children[n]; return R("");
  }

  C.less = (a, stdin) => C.cat(a, stdin);
  C.more = (a, stdin) => C.cat(a, stdin);
  C.man = (a) => {
    const c = a[0];
    if (!c) return ERR("What manual page do you want? (try: man ls)");
    if (!MAN[c]) return ERR(`No manual entry for ${c}`);
    return R(`${c} - ${MAN[c]}`, `<span class="term-cmd">${esc(c)}</span> — ${esc(MAN[c])}`);
  };
  C.apropos = (a) => {
    const q = (a[0] || "").toLowerCase();
    const hits = Object.keys(MAN).filter((k) => k.includes(q) || MAN[k].toLowerCase().includes(q));
    return hits.length ? R(hits.map((k) => `${k} (1) - ${MAN[k]}`).join("\n")) : ERR(`${a[0]}: nothing appropriate.`);
  };
  C.info = (a) => C.man(a);

  C.cowsay = (a) => {
    const msg = a.join(" ") || "moo";
    const top = " " + "_".repeat(msg.length + 2);
    const bot = " " + "-".repeat(msg.length + 2);
    return R(`${top}\n< ${msg} >\n${bot}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`);
  };
  C.neofetch = () => {
    const logo = ["      .--.     ", "     |o_o |    ", "     |:_/ |    ", "    //   \\ \\   ", "   (|     | )  ", "  /'\\_   _/`\\  ", "  \\___)=(___/  "];
    const info = [`<span class="term-cmd">${USER}@${HOST}</span>`, "-----------------", "OS: WebTerm Linux (simulated)", "Shell: bash 5.2", "Terminal: portfolio-webterm", "CPU: Browser JS Engine", "Uptime: this session", "Role: SOC Analyst in training 🛡️"];
    let html = "";
    for (let i = 0; i < Math.max(logo.length, info.length); i++) html += `<span class="term-logo">${esc(logo[i] || "               ")}</span>  ${info[i] || ""}<br>`;
    return R("neofetch", html);
  };

  /* editor commands */
  C.nano = (a) => { openEditor(a[0]); return R(""); };
  C.vi = C.nano; C.vim = C.nano; C.edit = C.nano;

  C.reset = () => {
    resetSession();
    outEl.innerHTML = "";
    print('<span class="term-dim">Session reset to defaults.</span>');
    print(C.neofetch().html);
    updatePrompt();
    return R("");
  };

  // aliases for convenience
  C.dir = C.ls; C.cls = C.clear;

  /* ---------- nano editor overlay ---------- */
  let editorEl = null;
  function ensureEditor() {
    if (editorEl) return;
    editorEl = document.createElement("div");
    editorEl.className = "nano-overlay";
    editorEl.innerHTML =
      '<div class="nano-win">' +
      '<div class="nano-top">GNU nano — <span class="nano-name"></span></div>' +
      '<textarea class="nano-area" spellcheck="false"></textarea>' +
      '<div class="nano-bottom"><span><b>^O</b> / Ctrl+S Save</span><span><b>^X</b> / Esc Exit</span></div>' +
      '</div>';
    document.body.appendChild(editorEl);
  }
  function openEditor(fname) {
    if (!fname) { print(`<span class="term-err">nano: missing filename (try: nano scratch.txt)</span>`); return; }
    ensureEditor();
    const p = normalize(fname);
    const par = parentOf(p); const name = baseName(p);
    if (!par || par.type !== "dir") { print(`<span class="term-err">nano: cannot open '${esc(fname)}'</span>`); return; }
    const existing = par.children[name];
    if (existing && existing.type === "dir") { print(`<span class="term-err">nano: '${esc(fname)}' is a directory</span>`); return; }
    const area = editorEl.querySelector(".nano-area");
    editorEl.querySelector(".nano-name").textContent = fname;
    area.value = existing ? existing.content : "";
    editorEl.classList.add("open");
    area.focus();

    const save = () => { par.children[name] = file(area.value, existing ? existing.mode : "644"); print(`<span class="term-dim">[ Wrote "${esc(fname)}" ]</span>`); saveSession(); };
    const close = () => { editorEl.classList.remove("open"); area.onkeydown = null; if (inEl) inEl.focus(); };
    area.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
      else if ((e.ctrlKey && e.key.toLowerCase() === "o")) { e.preventDefault(); save(); }
      else if (e.key === "Escape" || (e.ctrlKey && e.key.toLowerCase() === "x")) { e.preventDefault(); close(); }
    };
    editorEl.querySelector(".nano-bottom").onclick = null;
  }

  /* ---------- Pipeline execution ---------- */
  function splitTop(line, sep) {
    const parts = []; let cur = "", q = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { cur += ch; if (ch === q) q = null; }
      else if (ch === '"' || ch === "'") { q = ch; cur += ch; }
      else if (ch === sep) { parts.push(cur); cur = ""; }
      else cur += ch;
    }
    parts.push(cur); return parts;
  }
  function tokenize(s) {
    const tokens = []; let cur = "", q = null, has = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) { if (ch === q) q = null; else cur += ch; has = true; }
      else if (ch === '"' || ch === "'") { q = ch; has = true; }
      else if (/\s/.test(ch)) { if (has) { tokens.push(cur); cur = ""; has = false; } }
      else { cur += ch; has = true; }
    }
    if (has) tokens.push(cur);
    return tokens;
  }

  function execute(raw) {
    const line = raw.trim();
    print(`<span class="term-prompt">${esc(promptEl.textContent)}</span> ${esc(line)}`);
    if (!line) return;
    history.push(line); histIdx = history.length;

    const stages = splitTop(line, "|").map((s) => s.trim()).filter(Boolean);
    let stdin = null, result = null;
    for (let i = 0; i < stages.length; i++) {
      let tokens = tokenize(stages[i]);
      let cmd = tokens[0];
      // alias expansion (first stage token)
      if (aliases[cmd]) { tokens = tokenize(aliases[cmd]).concat(tokens.slice(1)); cmd = tokens[0]; }
      const args = tokens.slice(1);
      if (!C[cmd]) { print(`<span class="term-err">${esc(cmd)}: command not found</span> <span class="term-dim">— type 'help'</span>`); return; }
      result = asResult(C[cmd](args, stdin));
      if (result.error) { print(result.html != null ? result.html : htmlFromText(result.text)); return; }
      stdin = result.text;
    }
    if (result && (result.html || result.text !== "")) {
      print(result.html != null ? result.html : htmlFromText(result.text));
    }
    saveSession();
  }

  /* ---------- Tab completion ---------- */
  function complete() {
    const val = inEl.value;
    const tokens = val.split(" ");
    const last = tokens[tokens.length - 1];
    let options = [];
    if (tokens.length === 1) options = Object.keys(C).filter((c) => c.startsWith(last));
    else {
      const slash = last.lastIndexOf("/");
      const base = slash >= 0 ? last.slice(0, slash + 1) : "";
      const frag = slash >= 0 ? last.slice(slash + 1) : last;
      const node = getNode(normalize(base || "."));
      if (node && node.type === "dir") options = Object.keys(node.children).filter((n) => n.startsWith(frag)).map((n) => base + n + (node.children[n].type === "dir" ? "/" : ""));
    }
    if (options.length === 1) { tokens[tokens.length - 1] = options[0]; inEl.value = tokens.join(" "); }
    else if (options.length > 1) {
      print(`<span class="term-prompt">${esc(promptEl.textContent)}</span> ${esc(val)}`);
      print(options.map((o) => esc(o.replace(/\/$/, ""))).join("&nbsp;&nbsp;&nbsp;"));
    }
  }

  /* ---------- Public API ---------- */
  function run(cmd) { inEl.value = ""; execute(cmd); inEl.focus(); }
  function init(root) {
    rootRef = root;
    root.innerHTML =
      '<div class="term-output" id="termOut"></div>' +
      '<div class="term-inputline"><span class="term-prompt" id="termPrompt"></span>' +
      '<input class="term-input" id="termIn" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="terminal input" /></div>';
    outEl = root.querySelector("#termOut");
    inEl = root.querySelector("#termIn");
    promptEl = root.querySelector("#termPrompt");
    loadSession();
    updatePrompt();
    const restored = window.KTStore && KTStore.has("term");
    print('<span class="term-dim">WebTerm — simulated Linux shell with pipes (|). Type <span class="term-cmd">help</span> to begin.' +
      (restored ? ' Session restored — <span class="term-cmd">reset</span> to start fresh.' : '') + '</span>');
    print(C.neofetch().html);

    inEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { const v = inEl.value; inEl.value = ""; execute(v); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (histIdx > 0) { histIdx--; inEl.value = history[histIdx] || ""; } }
      else if (e.key === "ArrowDown") { e.preventDefault(); if (histIdx < history.length - 1) { histIdx++; inEl.value = history[histIdx] || ""; } else { histIdx = history.length; inEl.value = ""; } }
      else if (e.key === "Tab") { e.preventDefault(); complete(); }
      else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); outEl.innerHTML = ""; }
    });
    root.addEventListener("click", (e) => { if (e.target.tagName !== "A") inEl.focus(); });
  }

  window.WebTerm = { init, run };
})();
