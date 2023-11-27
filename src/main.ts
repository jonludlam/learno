import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { showPanel } from "@codemirror/view"
import { StateField, StateEffect } from "@codemirror/state"
// import { keymap } from "@codemirror/view"

import { StreamLanguage } from "@codemirror/language"
import {oCaml} from "@codemirror/legacy-modes/mode/mllike"

const toggleHelp = StateEffect.define<{id:string, solution:string}>()

 function helpPanelState(config : {id:string, solution:string}) {
  return StateField.define<{id:string, solution:string}>({
  create: () => config,
  update(value, tr) {
    for (let e of tr.effects) if (e.is(toggleHelp)) value = e.value
    return value
  },
  provide: f => showPanel.from(f, config => createHelpPanel(config))
})}

function append_to_output(id : string, output : any, only_mime : boolean) {
  const container = document.getElementById(id)!
  container.innerHTML = '';
  const pre = document.createElement('pre')
  pre.textContent = "" + (output.stdout || "") + (output.caml_ppf || "")
  if (!only_mime) {
    container.appendChild(pre)
  }
  let arr = output.mime_vals || []
  arr.forEach(function(item : any) {

    let mime_split = item.mime_type ? item.mime_type.split("/") : []
    if (mime_split[0] == "image" && item.encoding == "Base64") {
      const img = document.createElement('img')
      img.src = "data:" + item.mime_type + ";base64," + item.data
      container.appendChild(img)
    } else if (item.mime_type = "text/html") {
      const div = document.createElement('div')
      div.innerHTML = item.data
      container.appendChild(div)
    }
  })
}

function createHelpPanel(config : {id:string, solution:string}) {
  return (function (view:EditorView) {
    let dom = document.createElement("div")
    let button = document.createElement("button")
    dom.appendChild(button)
    button.textContent = "Run"
    let span = document.createElement("span")
    dom.appendChild(span)
    dom.className = "cm-run-panel"
    button.onclick = () => {
      exec(view.state.doc.toString()).then((result : any) =>
      append_to_output("output-"+config.id, result, false))
    }
    if (config.solution != "") {
      let button = document.createElement("button")
      dom.appendChild(button)
      button.textContent = "Show solution"
      button.onclick = function() {
        let solution = document.getElementsByClassName(config.solution)[0]
        let solution2 = <HTMLElement>solution

         console.log("here we are!")
         view.dispatch({
          changes: {from: 0, to:view.state.doc.length, insert: solution2.innerText}
        })
    }}
    return {top: true, dom}
  })
}

const helpTheme = EditorView.baseTheme({
  ".cm-help-panel": {
    padding: "5px 10px",
    backgroundColor: "#222222",
    fontFamily: "monospace"
  }
})


function helpPanel(id : string, solution : string) {
  return [helpPanelState({id,solution}), helpTheme]
}

var output = 1

function make_editor(domelt : Element) {
  let parent = domelt.parentElement!
  let grandparent = parent.parentElement!
  let outputelt = document.createElement("div")
  let id = "id"+output++
  let mime_only = parent.classList.contains('mime-only')
  let solution = ""
  parent.classList.forEach(function(item) {
    if (item.startsWith("solution-")) {
      solution = item.slice(9)
    }
  })
  outputelt.setAttribute("id","output-"+id)
  if(parent) {
    if(parent.classList.contains('autorun')) {
      exec(domelt.textContent!).then((result : any) =>
      append_to_output("output-"+id, result, mime_only))
    }

    if(parent.classList.contains('noshow')) {
      parent.style.display = "none"
      grandparent.appendChild(outputelt)
      return null
    } else {
      let editor = new EditorView({
          doc: domelt.textContent || "",
          extensions: [
            basicSetup,
            StreamLanguage.define(oCaml),
            helpPanel(id, solution)
          ],
          parent: grandparent})
      parent.remove()
      grandparent.appendChild(outputelt)
      return editor
    }
  }
  return null
}

document.addEventListener("DOMContentLoaded", () => {
  const elts = document.querySelectorAll("pre code");
  elts.forEach((e) => make_editor(e));
  const header = document.querySelectorAll("header.odoc-preamble")
  const sections = document.querySelectorAll("div.odoc-content > section")
  const arr1 = Array.from(header as NodeListOf<HTMLElement>)
  const arr2 = Array.from(sections as NodeListOf<HTMLElement>)
  const arr = arr1.concat(arr2) 
  arr.forEach(function(e) {
    e.style.display = "none"
    let button = document.createElement("button")
    button.textContent = "Prev"
    button.onclick = () => {
      let i = arr.indexOf(e)
      let next = (i + arr.length - 1) % arr.length
      showsection(next)
    }
    e.appendChild(button)
    let button2 = document.createElement("button")
    button2.textContent = "Next"
    button2.onclick = () => {
      let i = arr.indexOf(e)
      let next = (i + 1) % arr.length
      showsection(next)
    }
    e.appendChild(button2)

  })
  showsection(0)
});

// OCaml toplevel stuff

const worker = new Worker(new URL('./worker.js', import.meta.url), {
  type: 'module'
})

var promises = new Map()
var id = 1

worker.onmessage = function (e) {
    var j = JSON.parse(e.data)
    if (j.id) {
        var promise = promises.get(j.id)
        promises.delete(j.id)
        promise(j.result)
    }
}

function rpc(method : string, params : any) {
    const localid = id++;
    return new Promise(function (resolve, _reject) {
        worker.postMessage(JSON.stringify({ id:localid, method, params }));
        promises.set(localid,resolve)
    })
}

function init(cmas : Array<{ fn : string, url : string}>, cmi_urls : Array<string>) {
    return rpc("init",[{init_libs:{cmas,cmi_urls}}])
}

function setup() {
  return rpc("setup",[null])
}

function exec(phrase : string) {
  return rpc("exec",[phrase])
}

function dump(result : any) {
  console.log(result.stdout)
}

init([],[])
setup().then((result) => dump(result))

function showsection(n : number) {
  const header = document.querySelectorAll("header.odoc-preamble")
  const sections = document.querySelectorAll("div.odoc-content > section")
  const arr1 = Array.from(header as NodeListOf<HTMLElement>)
  const arr2 = Array.from(sections as NodeListOf<HTMLElement>)
  const arr = arr1.concat(arr2) 
  arr.forEach((e) => e.style.display = "none")
  arr[n].style.display = "block"
}
