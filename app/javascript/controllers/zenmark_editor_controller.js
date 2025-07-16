import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "mdtextarea", "linkDialog", "linkText", "linkUrl", "fileInput", "previewArea" ]

  connect() {
    console.log("Zenmark editor controller connected")
  }

  bold(event) {
    event.preventDefault()
    this.wrapText("**", "**")
  }

  italic(event) {
    event.preventDefault()
    this.wrapText("*", "*")
  }

  strikethrough(event) {
    event.preventDefault()
    this.wrapText("~~", "~~")
  }

  heading(event) {
    event.preventDefault()
    this.prefixText("## ")
  }

  blockquote(event) {
    event.preventDefault()
    this.prefixText("> ")
  }

  code(event) {
    event.preventDefault()
    this.wrapText("\n```\n", "\n```\n")
  }

  link(event) {
    event.preventDefault()
    const textarea = this.mdtextareaTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)

    this.linkTextTarget.value = selectedText
    this.linkDialogTarget.style.display = "block"
    this.linkUrlTarget.focus()
  }

  closeLinkDialog(event) {
    event.preventDefault()
    this.linkDialogTarget.style.display = "none"
  }

  insertLink(event) {
    event.preventDefault()
    const text = this.linkTextTarget.value
    const url = this.linkUrlTarget.value
    this.wrapText(`[${text}](${url})`, "")
    this.closeLinkDialog(event)
  }

  image(event) {
    event.preventDefault()
    this.fileInputTarget.click()
  }

  uploadImage(event) {
    const file = event.target.files[0]
    const formData = new FormData()
    formData.append("file", file)

    fetch("/zenmark/images", {
      method: "POST",
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      this.insertText(`![${file.name}](/rails/active_storage/blobs/${data.signed_id}/${file.name})`)
    })
  }

  preview(event) {
    event.preventDefault()
    const markdownContent = this.textareaTarget.value

    fetch("/zenmark/previews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content
      },
      body: JSON.stringify({ content: markdownContent })
    })
    .then(response => response.text())
    .then(html => {
      this.previewAreaTarget.innerHTML = html
    })
  }

  unorderedList(event) {
    event.preventDefault()
    this.prefixText("- ")
  }

  orderedList(event) {
    event.preventDefault()
    this.prefixText("1. ")
  }

  horizontalRule(event) {
    event.preventDefault()
    this.insertText("\n---\n")
  }

  prefixText(prefix) {
    const textarea = this.textareaTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    const selectedText = textarea.value.substring(start, end)
    const newText = `${prefix}${selectedText}`

    textarea.setRangeText(newText, start, end)
    textarea.focus()
    textarea.selectionStart = textarea.selectionEnd = start + newText.length
  }

  insertText(text) {
    const textarea = this.mdtextareaTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    textarea.setRangeText(text, start, end)
    textarea.focus()
    textarea.selectionStart = textarea.selectionEnd = start + text.length
  }

  wrapText(prefix, suffix) {
    const textarea = this.mdtextareaTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const newText = `${prefix}${selectedText}${suffix}`

    textarea.setRangeText(newText, start, end)
    textarea.focus()
    textarea.selectionStart = textarea.selectionEnd = start + newText.length
  }

  replaceText(star) {
    const textarea = this.mdtextareaTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const newText = `${prefix}${selectedText}${suffix}`

    textarea.setRangeText(newText, start, end)
    textarea.focus()
    textarea.selectionStart = textarea.selectionEnd = start + newText.length

  }
}
