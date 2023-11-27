"use strict";
exports.__esModule = true;
var view_1 = require("@codemirror/view");
var codemirror_1 = require("codemirror");
var view_2 = require("@codemirror/view");
var state_1 = require("@codemirror/state");
var language_1 = require("@codemirror/language");
var mllike_1 = require("@codemirror/legacy-modes/mode/mllike");
var toggleHelp = state_1.StateEffect.define();
function helpPanelState(id) {
    return state_1.StateField.define({
        create: function () { return id; },
        update: function (value, tr) {
            for (var _i = 0, _a = tr.effects; _i < _a.length; _i++) {
                var e = _a[_i];
                if (e.is(toggleHelp))
                    value = e.value;
            }
            return value;
        },
        provide: function (f) { return view_2.showPanel.from(f, function (id) { return createHelpPanel(id); }); }
    });
}
function append_to_output(id, output) {
    var container = document.getElementById(id);
    container.innerHTML = '';
    var pre = document.createElement('pre');
    pre.textContent = output.stdout + output.caml_ppf;
    container.appendChild(pre);
    var arr = output.mime_vals || [];
    arr.forEach(function (item) {
        var mime_split = item.mime_type ? item.mime_type.split("/") : [];
        if (mime_split[0] == "image" && item.encoding == "Base64") {
            var img = document.createElement('img');
            img.src = "data:" + item.mime_type + ";base64," + item.data;
            container.appendChild(img);
        }
    });
}
function createHelpPanel(id) {
    return (function (view) {
        var dom = document.createElement("div");
        var button = document.createElement("button");
        dom.appendChild(button);
        button.textContent = "Run";
        var span = document.createElement("span");
        dom.appendChild(span);
        dom.className = "cm-run-panel";
        button.onclick = function () {
            exec(view.state.doc.toString()).then(function (result) {
                return append_to_output("output-" + id, result);
            });
        };
        return { top: true, dom: dom };
    });
}
var helpTheme = view_1.EditorView.baseTheme({
    ".cm-help-panel": {
        padding: "5px 10px",
        backgroundColor: "#222222",
        fontFamily: "monospace"
    }
});
function helpPanel(id) {
    return [helpPanelState(id), helpTheme];
}
var output = 1;
function make_editor(domelt) {
    var parent = domelt.parentElement;
    var grandparent = parent.parentElement;
    var outputelt = document.createElement("div");
    var id = "id" + output++;
    outputelt.setAttribute("id", "output-" + id);
    if (parent) {
        var editor = new view_1.EditorView({
            doc: domelt.textContent || "",
            extensions: [
                codemirror_1.basicSetup,
                language_1.StreamLanguage.define(mllike_1.oCaml),
                helpPanel(id)
            ],
            parent: grandparent
        });
        parent.remove();
        grandparent.appendChild(outputelt);
        return editor;
    }
}
document.addEventListener("DOMContentLoaded", function () {
    var elts = document.querySelectorAll("pre code");
    elts.forEach(function (e) { return make_editor(e); });
    var header = document.querySelectorAll("header.odoc-preamble");
    var sections = document.querySelectorAll("div.odoc-content > section");
    var arr1 = Array.from(header);
    var arr2 = Array.from(sections);
    var arr = arr1.concat(arr2);
    arr.forEach(function (e) {
        e.style.display = "none";
        var button = document.createElement("button");
        button.textContent = "Prev";
        button.onclick = function () {
            var i = arr.indexOf(e);
            var next = (i + arr.length - 1) % arr.length;
            showsection(next);
        };
        e.appendChild(button);
        var button2 = document.createElement("button");
        button2.textContent = "Next";
        button2.onclick = function () {
            var i = arr.indexOf(e);
            var next = (i + 1) % arr.length;
            showsection(next);
        };
        e.appendChild(button2);
    });
    showsection(0);
});
// OCaml toplevel stuff
var worker = new Worker(new URL('./worker.js', import.meta.url), {
    type: 'module'
});
var promises = new Map();
var id = 1;
worker.onmessage = function (e) {
    var j = JSON.parse(e.data);
    if (j.id) {
        var promise = promises.get(j.id);
        promises["delete"](j.id);
        promise(j.result);
    }
};
function rpc(method, params) {
    var localid = id++;
    return new Promise(function (resolve, reject) {
        worker.postMessage(JSON.stringify({ id: localid, method: method, params: params }));
        promises.set(localid, resolve);
    });
}
function init(cmas, cmi_urls) {
    return rpc("init", [{ init_libs: { cmas: cmas, cmi_urls: cmi_urls } }]);
}
function setup() {
    return rpc("setup", [null]);
}
function exec(phrase) {
    return rpc("exec", [phrase]);
}
function dump(result) {
    console.log(result.stdout);
}
init([], []);
setup().then(function (result) { return dump(result); });
function showsection(n) {
    var header = document.querySelectorAll("header.odoc-preamble");
    var sections = document.querySelectorAll("div.odoc-content > section");
    var arr1 = Array.from(header);
    var arr2 = Array.from(sections);
    var arr = arr1.concat(arr2);
    arr.forEach(function (e) { return e.style.display = "none"; });
    arr[n].style.display = "block";
}
