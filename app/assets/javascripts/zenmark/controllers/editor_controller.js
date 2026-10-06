import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "mdtextarea", "textarea", "fileInput", "workspace",
    "editorPane", "previewPane", "previewArea",
    "wordCount", "charCount", "readingTime",
    "linkDialog", "linkText", "linkUrl",
    "imageMdDialog", "toast", "fullscreenBtn", "fullscreenIcon",
    "modeWriteBtn", "modeSplitBtn", "modePreviewBtn"
  ]

  static values = {
    imageUploadUrl: String,
    sgid: String
  }

  connect() {
    this.currentMode = "write"
    this.isFullscreen = false
    this.previewDebounceTimer = null
    this.toastTimer = null

    // Register event listeners
    this.boundKeydown = this.onKeydown.bind(this)
    this.textarea.addEventListener("keydown", this.boundKeydown)

    this.boundPaste = this.handlePaste.bind(this)
    this.textarea.addEventListener("paste", this.boundPaste)

    this.boundInput = this.onInput.bind(this)
    this.textarea.addEventListener("input", this.boundInput)

    // Calculate initial statistics
    this.updateStats()
  }

  disconnect() {
    if (this.boundKeydown) this.textarea.removeEventListener("keydown", this.boundKeydown)
    if (this.boundPaste) this.textarea.removeEventListener("paste", this.boundPaste)
    if (this.boundInput) this.textarea.removeEventListener("input", this.boundInput)
    if (this.previewDebounceTimer) clearTimeout(this.previewDebounceTimer)
    if (this.toastTimer) clearTimeout(this.toastTimer)
  }

  // Universal accessor for the textarea element
  get textarea() {
    if (this.hasMdtextareaTarget) return this.mdtextareaTarget
    if (this.hasTextareaTarget) return this.textareaTarget
    return this.element.querySelector("textarea")
  }

  // --- Statistics & Counting ---

  onInput() {
    this.updateStats()
    if (this.currentMode === "split") {
      this.scheduleLivePreview()
    }
  }

  updateStats() {
    const text = this.textarea.value || ""
    const trimmed = text.trim()

    // Words
    const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length
    if (this.hasWordCountTarget) {
      this.wordCountTarget.textContent = `${words.toLocaleString()} ${words === 1 ? "word" : "words"}`
    }

    // Characters
    const chars = text.length
    if (this.hasCharCountTarget) {
      this.charCountTarget.textContent = `${chars.toLocaleString()} chars`
    }

    // Reading time (average 200 words per minute)
    const readMinutes = Math.max(1, Math.ceil(words / 200))
    if (this.hasReadingTimeTarget) {
      this.readingTimeTarget.textContent = words === 0 ? "0 min read" : `~${readMinutes} min read`
    }
  }

  // --- Keyboard Shortcuts & Smart Typing ---

  onKeydown(event) {
    const isMetaOrCtrl = event.metaKey || event.ctrlKey

    // 1. Meta / Ctrl shortcuts
    if (isMetaOrCtrl) {
      const key = event.key.toLowerCase()

      if (key === "b" && !event.shiftKey) {
        event.preventDefault()
        this.bold(event)
        return
      }

      if (key === "i" && !event.shiftKey) {
        event.preventDefault()
        this.italic(event)
        return
      }

      if (key === "k" && !event.shiftKey) {
        event.preventDefault()
        this.link(event)
        return
      }

      if (key === "s" && !event.shiftKey) {
        event.preventDefault()
        this.saveForm(event)
        return
      }

      if (key === "x" && event.shiftKey) {
        event.preventDefault()
        this.strikethrough(event)
        return
      }

      if (key === "c" && event.shiftKey) {
        event.preventDefault()
        this.code(event)
        return
      }

      if (key === "h" && event.shiftKey) {
        event.preventDefault()
        this.heading2(event)
        return
      }

      if (key === "8" && event.shiftKey) {
        event.preventDefault()
        this.unorderedList(event)
        return
      }

      if (key === "7" && event.shiftKey) {
        event.preventDefault()
        this.orderedList(event)
        return
      }
    }

    // 2. Escape key handling
    if (event.key === "Escape") {
      if (this.hasLinkDialogTarget && !this.linkDialogTarget.classList.contains("hidden")) {
        this.closeLinkDialog(event)
        return
      }
      if (this.hasImageMdDialogTarget && !this.imageMdDialogTarget.classList.contains("hidden")) {
        this.closeImageDialog(event)
        return
      }
      if (this.isFullscreen) {
        this.toggleFullscreen(event)
        return
      }
    }

    // 3. Tab & Shift+Tab indentation
    if (event.key === "Tab") {
      event.preventDefault()
      this.handleTab(event.shiftKey)
      return
    }

    // 4. Smart Enter in lists / quotes
    if (event.key === "Enter" && !event.shiftKey && !isMetaOrCtrl) {
      if (this.handleSmartEnter(event)) {
        return
      }
    }

    // 5. Auto-closing / wrapping selected text with punctuation
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`', '*': '*' }
    if (pairs[event.key]) {
      const textarea = this.textarea
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (start !== end) {
        event.preventDefault()
        const selected = textarea.value.substring(start, end)
        const wrapped = `${event.key}${selected}${pairs[event.key]}`
        textarea.setRangeText(wrapped, start, end, "select")
        this.updateStats()
        return
      }
    }
  }

  handleSmartEnter(event) {
    const textarea = this.textarea
    const pos = textarea.selectionStart
    const val = textarea.value

    const lineStart = val.lastIndexOf("\n", pos - 1) + 1
    const currentLine = val.substring(lineStart, pos)

    // Task Checklist: "- [ ] " or "- [x] "
    const taskMatch = currentLine.match(/^(\s*[-*]\s+\[[ xX]\]\s+)(.*)$/)
    if (taskMatch) {
      event.preventDefault()
      if (taskMatch[2].trim() === "") {
        // Empty task item -> exit list
        textarea.setRangeText("", lineStart, pos, "end")
      } else {
        this.insertAtCursor("\n- [ ] ")
      }
      this.updateStats()
      return true
    }

    // Bullet List: "- " or "* "
    const bulletMatch = currentLine.match(/^(\s*[-*]\s+)(.*)$/)
    if (bulletMatch) {
      event.preventDefault()
      if (bulletMatch[2].trim() === "") {
        // Empty bullet item -> exit list
        textarea.setRangeText("", lineStart, pos, "end")
      } else {
        this.insertAtCursor(`\n${bulletMatch[1]}`)
      }
      this.updateStats()
      return true
    }

    // Numbered List: "1. "
    const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/)
    if (numberedMatch) {
      event.preventDefault()
      if (numberedMatch[3].trim() === "") {
        // Empty numbered item -> exit list
        textarea.setRangeText("", lineStart, pos, "end")
      } else {
        const nextNum = parseInt(numberedMatch[2], 10) + 1
        this.insertAtCursor(`\n${numberedMatch[1]}${nextNum}. `)
      }
      this.updateStats()
      return true
    }

    // Blockquote: "> "
    const quoteMatch = currentLine.match(/^(\s*>\s*)(.*)$/)
    if (quoteMatch) {
      event.preventDefault()
      if (quoteMatch[2].trim() === "") {
        textarea.setRangeText("", lineStart, pos, "end")
      } else {
        this.insertAtCursor("\n> ")
      }
      this.updateStats()
      return true
    }

    return false
  }

  handleTab(isShift) {
    const textarea = this.textarea
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const val = textarea.value

    // Single cursor position without selection
    if (start === end && !isShift) {
      this.insertAtCursor("  ")
      this.updateStats()
      return
    }

    // Multi-line indent/unindent
    const lineStart = val.lastIndexOf("\n", start - 1) + 1
    const nextNewline = val.indexOf("\n", end)
    const lineEnd = nextNewline === -1 ? val.length : nextNewline
    const selectedText = val.substring(lineStart, lineEnd)
    const lines = selectedText.split("\n")

    let newText
    if (isShift) {
      newText = lines.map(line => line.replace(/^ {1,2}/, "")).join("\n")
    } else {
      newText = lines.map(line => "  " + line).join("\n")
    }

    textarea.setRangeText(newText, lineStart, lineEnd, "select")
    this.updateStats()
  }

  saveForm(event) {
    event?.preventDefault?.()
    const form = this.element.closest("form")
    if (form) {
      this.showToast("Saving...")
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit()
      } else {
        form.submit()
      }
    }
  }

  // --- Text Formatting Helpers ---

  bold(event) {
    event?.preventDefault?.()
    this.wrapText("**", "**", "bold text")
  }

  italic(event) {
    event?.preventDefault?.()
    this.wrapText("*", "*", "italic text")
  }

  strikethrough(event) {
    event?.preventDefault?.()
    this.wrapText("~~", "~~", "strikethrough text")
  }

  heading2(event) {
    event?.preventDefault?.()
    this.prefixText("## ", "Heading 2")
  }

  heading3(event) {
    event?.preventDefault?.()
    this.prefixText("### ", "Heading 3")
  }

  heading(event) {
    this.heading2(event)
  }

  blockquote(event) {
    event?.preventDefault?.()
    this.prefixText("> ", "Quote")
  }

  code(event) {
    event?.preventDefault?.()
    const textarea = this.textarea
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = textarea.value.substring(start, end)

    if (selected.includes("\n") || selected.length > 50) {
      this.wrapText("\n```\n", "\n```\n", "code block")
    } else {
      this.wrapText("`", "`", "code")
    }
  }

  unorderedList(event) {
    event?.preventDefault?.()
    this.prefixText("- ", "List item")
  }

  orderedList(event) {
    event?.preventDefault?.()
    this.prefixText("1. ", "First item")
  }

  checklist(event) {
    event?.preventDefault?.()
    this.prefixText("- [ ] ", "Task item")
  }

  horizontalRule(event) {
    event?.preventDefault?.()
    this.insertAtCursor("\n\n---\n\n")
  }

  insertTable(event) {
    event?.preventDefault?.()
    const tableTemplate = "\n\n| Column 1 | Column 2 | Column 3 |\n| :--- | :--- | :--- |\n| Item 1 | Details | Value |\n| Item 2 | Details | Value |\n\n"
    this.insertAtCursor(tableTemplate)
  }

  prefixText(prefix, defaultText = "") {
    const textarea = this.textarea
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const textToInsert = selectedText || defaultText
    const newText = `${prefix}${textToInsert}`

    textarea.setRangeText(newText, start, end, "end")
    textarea.focus()
    this.updateStats()
    if (this.currentMode === "split") this.scheduleLivePreview()
  }

  wrapText(prefix, suffix, defaultText = "") {
    const textarea = this.textarea
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const textToInsert = selectedText || defaultText
    const newText = `${prefix}${textToInsert}${suffix}`

    textarea.setRangeText(newText, start, end, "end")
    textarea.focus()
    this.updateStats()
    if (this.currentMode === "split") this.scheduleLivePreview()
  }

  insertAtCursor(text) {
    const textarea = this.textarea
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    textarea.setRangeText(text, start, end, "end")
    textarea.focus()
    this.updateStats()
    if (this.currentMode === "split") this.scheduleLivePreview()
  }

  // --- Link Dialog ---

  link(event) {
    event?.preventDefault?.()
    const textarea = this.textarea
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)

    if (this.hasLinkTextTarget) {
      this.linkTextTarget.value = selectedText
    }
    if (this.hasLinkUrlTarget) {
      this.linkUrlTarget.value = ""
    }

    if (this.hasLinkDialogTarget) {
      this.linkDialogTarget.classList.remove("hidden")
      if (this.hasLinkUrlTarget) {
        if (selectedText.length > 0) {
          this.linkUrlTarget.focus()
        } else if (this.hasLinkTextTarget) {
          this.linkTextTarget.focus()
        }
      }
    }
  }

  closeLinkDialog(event) {
    event?.preventDefault?.()
    if (this.hasLinkDialogTarget) {
      this.linkDialogTarget.classList.add("hidden")
      this.textarea.focus()
    }
  }

  closeLinkDialogOnBackdrop(event) {
    if (event.target === this.linkDialogTarget) {
      this.closeLinkDialog(event)
    }
  }

  stopEventPropagation(event) {
    event.stopPropagation()
  }

  insertLink(event) {
    event?.preventDefault?.()
    const text = (this.hasLinkTextTarget ? this.linkTextTarget.value.trim() : "") || "Link"
    const url = (this.hasLinkUrlTarget ? this.linkUrlTarget.value.trim() : "") || "#"

    this.insertAtCursor(`[${text}](${url})`)
    this.closeLinkDialog(event)
  }

  // --- Images: Picker, Paste & Drag-and-Drop ---

  image(event) {
    event?.preventDefault?.()
    if (this.hasFileInputTarget) {
      this.fileInputTarget.click()
    } else {
      let input = this.element.querySelector('input[type="file"]')
      if (!input) {
        input = document.createElement("input")
        input.type = "file"
        input.accept = "image/*"
        input.style.display = "none"
        this.element.appendChild(input)
      }
      input.onchange = (e) => this.uploadImageFile(e)
      input.click()
    }
  }

  uploadImage(event) {
    this.uploadImageFile(event)
  }

  uploadImageFile(event) {
    const files = event.target.files
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          this.uploadAndInsertImage(file)
        }
      }
      event.target.value = ""
    }
  }

  handlePaste(event) {
    const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items
    if (!items) return

    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        event.preventDefault()
        const file = item.getAsFile()
        if (file) {
          this.uploadAndInsertImage(file)
          return
        }
      }
    }
  }

  handleDragOver(event) {
    event.preventDefault()
    this.element.classList.add("zenmark-dragover")
  }

  handleDragLeave(event) {
    this.element.classList.remove("zenmark-dragover")
  }

  handleDrop(event) {
    event.preventDefault()
    this.element.classList.remove("zenmark-dragover")

    const files = event.dataTransfer?.files
    if (!files || files.length === 0) return

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        this.uploadAndInsertImage(file)
        return
      }
    }
  }

  uploadAndInsertImage(file) {
    const textarea = this.textarea
    const filename = file.name || "uploaded-image.png"
    const placeholder = `![Uploading ${filename}...]()`

    this.insertAtCursor(`\n${placeholder}\n`)
    this.showToast(`Uploading ${filename}...`)

    const formData = new FormData()
    formData.append("file", file)
    if (this.hasSgidValue && this.sgidValue) {
      formData.append("sgid", this.sgidValue)
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    fetch("/zenmark/images", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
      },
      body: formData
    })
    .then(async (response) => {
      if (!response.ok) {
        const errText = await response.text()
        console.error("Zenmark image upload failed with status:", response.status, errText)
        throw new Error(`Upload failed (${response.status})`)
      }
      return response.json()
    })
    .then(data => {
      const imageUrl = data.url || `/rails/active_storage/blobs/${data.signed_id}/${filename}`
      const mdImage = `![${data.filename || filename}](${imageUrl})`
      textarea.value = textarea.value.replace(placeholder, mdImage)
      this.updateStats()
      this.showToast("Image inserted successfully")
      if (this.currentMode === "split") this.scheduleLivePreview()
    })
    .catch(err => {
      console.error("Zenmark image upload failed:", err)
      textarea.value = textarea.value.replace(placeholder, `<!-- Image upload failed: ${filename} -->`)
      this.showToast("Image upload failed", true)
    })
  }

  closeImageDialog(event) {
    event?.preventDefault?.()
    if (this.hasImageMdDialogTarget) {
      this.imageMdDialogTarget.classList.add("hidden")
    }
  }

  copyImageMarkdown(event) {
    event?.preventDefault?.()
    const snippet = this.imageMdDialogTarget.querySelector("#image-md-text")?.textContent?.trim()
    if (snippet) {
      navigator.clipboard.writeText(snippet).then(() => {
        this.showToast("Copied to clipboard!")
        this.closeImageDialog(event)
      })
    }
  }

  // --- View Modes: Write | Split | Preview ---

  setWriteMode(event) {
    event?.preventDefault?.()
    this.currentMode = "write"
    this.applyModeClasses("zenmark-mode-write")
    this.updateModeButtonStates(this.modeWriteBtnTarget)
    this.textarea.focus()
  }

  setSplitMode(event) {
    event?.preventDefault?.()
    this.currentMode = "split"
    this.applyModeClasses("zenmark-mode-split")
    this.updateModeButtonStates(this.modeSplitBtnTarget)
    this.fetchPreview()
  }

  setPreviewMode(event) {
    event?.preventDefault?.()
    this.currentMode = "preview"
    this.applyModeClasses("zenmark-mode-preview")
    this.updateModeButtonStates(this.modePreviewBtnTarget)
    this.fetchPreview()
  }

  applyModeClasses(modeClass) {
    if (this.hasWorkspaceTarget) {
      this.workspaceTarget.classList.remove("zenmark-mode-write", "zenmark-mode-split", "zenmark-mode-preview")
      this.workspaceTarget.classList.add(modeClass)
    }
  }

  updateModeButtonStates(activeBtn) {
    const buttons = [this.modeWriteBtnTarget, this.modeSplitBtnTarget, this.modePreviewBtnTarget].filter(Boolean)
    buttons.forEach(btn => btn.classList.remove("active"))
    activeBtn.classList.add("active")
  }

  scheduleLivePreview() {
    if (this.previewDebounceTimer) clearTimeout(this.previewDebounceTimer)
    this.previewDebounceTimer = setTimeout(() => {
      this.fetchPreview()
    }, 280)
  }

  fetchPreview() {
    const markdownContent = this.textarea.value
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    fetch("/zenmark/previews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/html",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
      },
      body: JSON.stringify({ content: markdownContent })
    })
    .then(response => response.text())
    .then(html => {
      if (this.hasPreviewAreaTarget) {
        this.previewAreaTarget.innerHTML = html
      }
    })
    .catch(err => {
      console.error("Zenmark preview fetch error:", err)
    })
  }

  preview(event) {
    // Toolbar legacy preview action
    this.setPreviewMode(event)
  }

  // --- Zen Mode (Fullscreen) ---

  toggleFullscreen(event) {
    event?.preventDefault?.()
    this.isFullscreen = !this.isFullscreen

    if (this.isFullscreen) {
      this.element.classList.add("zenmark-fullscreen")
      if (this.hasFullscreenIconTarget) this.fullscreenIconTarget.textContent = "fullscreen_exit"
      if (this.hasFullscreenBtnTarget) this.fullscreenBtnTarget.setAttribute("title", "Exit Zen Mode (Esc)")
      this.showToast("Entered Zen Mode (Press Esc to exit)")
    } else {
      this.element.classList.remove("zenmark-fullscreen")
      if (this.hasFullscreenIconTarget) this.fullscreenIconTarget.textContent = "fullscreen"
      if (this.hasFullscreenBtnTarget) this.fullscreenBtnTarget.setAttribute("title", "Zen Mode (Esc)")
    }
    this.textarea.focus()
  }

  // --- Toast Notifications ---

  showToast(message, isError = false) {
    if (!this.hasToastTarget) return

    if (this.toastTimer) clearTimeout(this.toastTimer)

    this.toastTarget.textContent = message
    this.toastTarget.classList.remove("hidden")
    if (isError) {
      this.toastTarget.classList.add("zenmark-toast-error")
    } else {
      this.toastTarget.classList.remove("zenmark-toast-error")
    }

    this.toastTimer = setTimeout(() => {
      this.toastTarget.classList.add("hidden")
    }, 2600)
  }
}
