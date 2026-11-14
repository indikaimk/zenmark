import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [
    "mdtextarea", "textarea", "fileInput", "workspace",
    "editorPane", "previewPane", "previewArea",
    "wordCount", "charCount", "readingTime",
    "linkDialog", "linkText", "linkUrl",
    "imageMdDialog", "toast", "fullscreenBtn", "fullscreenIcon",
    "modeWriteBtn", "modeSplitBtn", "modePreviewBtn",
    "unsavedBadge", "saveBtn", "saveIcon", "saveLabel",
    "autosaveStatus", "autosaveTime",
    "diagramDialog", "diagramCanvas", "diagramTemplateSelect", "diagramTitle",
    "diagramCatalogSearch", "diagramProviderTabs", "diagramCatalogList",
    "diagramNoSelection", "diagramInspector", "diagramNodeLabel", "diagramNodeSub",
    "diagramNodeSubWrapper", "diagramNodePresetWrapper", "diagramNodePresetSelect", "diagramNodeThemeWrapper",
    "diagramConnectModeBtn", "diagramConnectModeLabel", "diagramConnectHint", "diagramConnectHintText",
    "diagramStatusText", "diagramInsertBtn", "diagramInsertLabel", "diagramFileInput"
  ]

  static values = {
    imageUploadUrl: String,
    saveUrl: String,
    sgid: String,
    autosave: { type: Boolean, default: false },
    autosaveInterval: { type: Number, default: 2500 }
  }

  connect() {
    this.currentMode = "write"
    this.isFullscreen = false
    this.previewDebounceTimer = null
    this.toastTimer = null
    this.saveFeedbackTimer = null
    this.autosaveTimer = null
    this.isSaving = false
    this.pendingAutosave = false
    this.initialValue = this.textarea ? this.textarea.value : ""

    // Register event listeners
    this.boundKeydown = this.onKeydown.bind(this)
    this.textarea.addEventListener("keydown", this.boundKeydown)

    this.boundPaste = this.handlePaste.bind(this)
    this.textarea.addEventListener("paste", this.boundPaste)

    this.boundInput = this.onInput.bind(this)
    this.textarea.addEventListener("input", this.boundInput)

    this.boundBlur = this.onBlur.bind(this)
    this.textarea.addEventListener("blur", this.boundBlur)

    this.boundBeforeUnload = (e) => {
      if (this.textarea && this.textarea.value !== this.initialValue) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", this.boundBeforeUnload)

    // Calculate initial statistics & unsaved state
    this.updateStats()
    this.syncUnsavedState()

    // Restore draft from local storage if initial textarea is empty
    this.checkLocalStorageRecovery()
  }

  disconnect() {
    if (this.boundKeydown) this.textarea.removeEventListener("keydown", this.boundKeydown)
    if (this.boundPaste) this.textarea.removeEventListener("paste", this.boundPaste)
    if (this.boundInput) this.textarea.removeEventListener("input", this.boundInput)
    if (this.boundBlur) this.textarea.removeEventListener("blur", this.boundBlur)
    if (this.boundBeforeUnload) window.removeEventListener("beforeunload", this.boundBeforeUnload)
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer)
    if (this.previewDebounceTimer) clearTimeout(this.previewDebounceTimer)
    if (this.toastTimer) clearTimeout(this.toastTimer)
    if (this.saveFeedbackTimer) clearTimeout(this.saveFeedbackTimer)
    if (this.diagramStudio) {
      this.diagramStudio.destroy()
      this.diagramStudio = null
    }
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
    if (this.autosaveValue) {
      this.scheduleAutosave()
    }
  }

  onBlur() {
    if (this.autosaveValue && this.textarea && this.textarea.value !== this.initialValue) {
      if (this.autosaveTimer) clearTimeout(this.autosaveTimer)
      this.performAutosave()
    }
  }

  scheduleAutosave() {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer)
    if (!this.textarea || this.textarea.value === this.initialValue) return

    const delay = this.autosaveIntervalValue > 0 ? this.autosaveIntervalValue : 2500
    this.autosaveTimer = setTimeout(() => {
      this.performAutosave()
    }, delay)
  }

  async performAutosave() {
    if (!this.textarea || this.textarea.value === this.initialValue) return
    if (this.isSaving) {
      this.pendingAutosave = true
      return
    }
    await this.saveForm(null, { isAutosave: true, silent: true })
  }

  get localStorageKey() {
    const identifier = this.sgidValue || this.saveUrlValue || window.location.pathname
    return `zenmark_draft_${identifier}`
  }

  backupToLocalStorage() {
    try {
      if (this.textarea && this.textarea.value) {
        localStorage.setItem(this.localStorageKey, JSON.stringify({
          content: this.textarea.value,
          savedAt: new Date().toISOString()
        }))
      }
    } catch (_e) {}
  }

  clearLocalStorageBackup() {
    try {
      localStorage.removeItem(this.localStorageKey)
    } catch (_e) {}
  }

  checkLocalStorageRecovery() {
    try {
      const raw = localStorage.getItem(this.localStorageKey)
      if (!raw) return
      const backup = JSON.parse(raw)
      if (backup && backup.content && backup.content !== this.initialValue && !this.initialValue) {
        this.textarea.value = backup.content
        this.updateStats()
        this.showToast("Restored unsaved draft from local storage")
      }
    } catch (_e) {}
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

    this.syncUnsavedState()
  }

  syncUnsavedState() {
    if (!this.hasUnsavedBadgeTarget || !this.textarea) return
    if (this.textarea.value !== this.initialValue) {
      this.unsavedBadgeTarget.classList.remove("hidden")
    } else {
      this.unsavedBadgeTarget.classList.add("hidden")
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
      if (this.hasDiagramDialogTarget && !this.diagramDialogTarget.classList.contains("hidden")) {
        this.closeDiagramModal(event)
        return
      }
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

    if (start === end && !isShift) {
      this.insertAtCursor("  ")
      this.updateStats()
      return
    }

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

  preserveSelection(event) {
    if (this.textarea) {
      this.savedSelectionStart = this.textarea.selectionStart
      this.savedSelectionEnd = this.textarea.selectionEnd
      this.savedScrollTop = this.textarea.scrollTop
    }
    event?.preventDefault?.()
  }

  restoreSelection() {
    if (!this.textarea) return
    if (typeof this.savedSelectionStart === "number" && typeof this.savedSelectionEnd === "number") {
      this.textarea.setSelectionRange(this.savedSelectionStart, this.savedSelectionEnd)
    }
    if (typeof this.savedScrollTop === "number") {
      this.textarea.scrollTop = this.savedScrollTop
    }
  }

  async saveForm(event, options = {}) {
    event?.preventDefault?.()
    const isAutosave = Boolean(options?.isAutosave)
    const silent = Boolean(options?.silent || isAutosave)

    // Cancel pending autosave timer if manual save is triggered
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer)

    // Prevent concurrent save requests
    if (this.isSaving) {
      if (isAutosave) {
        this.pendingAutosave = true
      }
      return
    }

    const form = this.element.closest("form")
    const targetUrl = form?.action || this.saveUrlValue || this.imageUploadUrlValue
    if (!targetUrl && !form) return

    // If nothing changed and this is an autosave, skip
    if (isAutosave && this.textarea && this.textarea.value === this.initialValue) {
      return
    }

    this.isSaving = true

    const selectionStart = this.textarea ? (this.textarea.selectionStart ?? this.savedSelectionStart) : null
    const selectionEnd = this.textarea ? (this.textarea.selectionEnd ?? this.savedSelectionEnd) : null
    const scrollTop = this.textarea ? (this.textarea.scrollTop ?? this.savedScrollTop) : null

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
    if (this.hasSaveBtnTarget) this.saveBtnTarget.disabled = true
    if (this.hasSaveLabelTarget) this.saveLabelTarget.textContent = isAutosave ? "Autosaving..." : "Saving..."
    if (this.hasSaveIconTarget && isAutosave) {
      this.saveIconTarget.classList.add("animate-spin")
      this.saveIconTarget.textContent = "progress_activity"
    }

    try {
      const formData = form ? new FormData(form) : new FormData()
      if (!form && this.textarea?.name) {
        formData.set(this.textarea.name, this.textarea.value)
        formData.set("_method", "patch")
      }
      if (!formData.has("commit")) {
        formData.set("commit", "Save")
      }

      const response = await fetch(targetUrl, {
        method: form?.method?.toUpperCase() || "POST",
        headers: {
          "X-CSRF-Token": csrfToken || "",
          "X-Zenmark-Save": "true",
          "Accept": "application/json, text/html"
        },
        body: formData
      })

      let data = null
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        data = await response.json()
      }

      if (!response.ok || (data && data.success === false)) {
        const errMsg = data?.error || "Failed to save changes."
        this.backupToLocalStorage()
        if (!silent) {
          this.showToast(errMsg, true)
        }
        if (this.hasSaveLabelTarget) this.saveLabelTarget.textContent = "Save"
        if (this.hasSaveIconTarget) {
          this.saveIconTarget.classList.remove("animate-spin", "text-emerald-600")
          this.saveIconTarget.classList.add("text-slate-500")
          this.saveIconTarget.textContent = "check"
        }
        return
      }

      this.initialValue = this.textarea ? this.textarea.value : ""
      this.clearLocalStorageBackup()
      this.syncUnsavedState()

      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      this.lastSavedTime = timeStr

      if (!silent) {
        this.showToast("Saved")
      }

      if (this.hasAutosaveStatusTarget) {
        this.autosaveStatusTarget.classList.remove("hidden")
        if (this.hasAutosaveTimeTarget) {
          this.autosaveTimeTarget.textContent = `Saved ${timeStr}`
        }
      }

      if (this.hasSaveLabelTarget) {
        this.saveLabelTarget.textContent = isAutosave ? `Saved ${timeStr}` : "Saved"
      }
      if (this.hasSaveIconTarget) {
        this.saveIconTarget.classList.remove("animate-spin", "text-slate-500")
        this.saveIconTarget.classList.add("text-emerald-600")
        this.saveIconTarget.textContent = "check"
      }

      if (data?.rendered_html !== undefined) {
        const previewEl = document.getElementById("lesson_markdown")
        if (previewEl) {
          previewEl.innerHTML = data.rendered_html
          const previewCard = document.getElementById("lesson_markdown_card")
          if (previewCard) previewCard.classList.remove("hidden")
          if (window.mermaid && typeof window.mermaid.run === "function") {
            const nodes = previewEl.querySelectorAll(".mermaid")
            if (nodes.length > 0) {
              window.mermaid.run({ nodes: nodes }).catch(() => {})
            }
          }
        }
      }

      this.element.dispatchEvent(new CustomEvent("zenmark:saved", { bubbles: true, detail: data }))

      if (this.saveFeedbackTimer) clearTimeout(this.saveFeedbackTimer)
      this.saveFeedbackTimer = setTimeout(() => {
        if (this.hasSaveLabelTarget) this.saveLabelTarget.textContent = "Save"
        if (this.hasSaveIconTarget) {
          this.saveIconTarget.classList.remove("text-emerald-600", "animate-spin")
          this.saveIconTarget.classList.add("text-slate-500")
          this.saveIconTarget.textContent = "check"
        }
      }, 3000)
    } catch (error) {
      this.backupToLocalStorage()
      if (!silent) {
        this.showToast(`Save error: ${error.message}`, true)
      }
      if (this.hasSaveLabelTarget) this.saveLabelTarget.textContent = "Save"
      if (this.hasSaveIconTarget) {
        this.saveIconTarget.classList.remove("animate-spin", "text-emerald-600")
        this.saveIconTarget.classList.add("text-slate-500")
        this.saveIconTarget.textContent = "check"
      }
    } finally {
      this.isSaving = false
      if (this.hasSaveBtnTarget) this.saveBtnTarget.disabled = false
      if (this.textarea && this.currentMode !== "preview" && !isAutosave) {
        this.textarea.focus({ preventScroll: true })
        if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
          this.textarea.setSelectionRange(selectionStart, selectionEnd)
        }
        if (typeof scrollTop === "number") {
          this.textarea.scrollTop = scrollTop
        }
      }

      if (this.pendingAutosave) {
        this.pendingAutosave = false
        this.scheduleAutosave()
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
    if (this.autosaveValue && this.textarea && this.textarea.value !== this.initialValue) {
      this.performAutosave()
    }
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
        this.renderMermaidInPreview()
        this.attachDiagramEditBadgesInPreview()
      }
    })
    .catch(err => {
      console.error("Zenmark preview fetch error:", err)
    })
  }

  renderMermaidInPreview() {
    if (!this.hasPreviewAreaTarget) return

    const codeBlocks = this.previewAreaTarget.querySelectorAll("pre > code.mermaid, pre > code.language-mermaid")
    codeBlocks.forEach((codeEl) => {
      const pre = codeEl.parentElement
      const div = document.createElement("div")
      div.className = "mermaid"
      div.setAttribute("data-controller", "mermaid")
      div.textContent = codeEl.textContent
      pre.replaceWith(div)
    })

    if (window.mermaid && typeof window.mermaid.run === "function") {
      const standaloneNodes = Array.from(
        this.previewAreaTarget.querySelectorAll('.mermaid:not([data-controller="mermaid"]):not([data-processed])')
      )
      if (standaloneNodes.length > 0) {
        window.mermaid.run({ nodes: standaloneNodes }).catch(() => {})
      }
    }
  }

  preview(event) {
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

  // --- Visual Architecture Diagram Studio (diagram-js) ---

  async openDiagramModal(event) {
    event?.preventDefault?.()
    if (!this.hasDiagramDialogTarget) return

    this.preserveSelection()
    this.diagramDialogTarget.classList.remove("hidden")

    if (!this.diagramStudio && this.hasDiagramCanvasTarget) {
      if (this.hasDiagramStatusTextTarget) {
        this.diagramStatusTextTarget.textContent = "Loading diagram-js engine..."
      }
      try {
        const mod = await import("zenmark_diagram")
        const CloudQubesDiagramStudio = mod.CloudQubesDiagramStudio || mod.default
        this.cloudCatalog = mod.CLOUD_CATALOG || []
        this.getCatalogIconSvg = mod.getCatalogIconSvg
        this.extractDiagramStateFromSvg = mod.extractDiagramStateFromSvg
        this.activeCatalogProvider = this.activeCatalogProvider || "all"

        this.populateDiagramPresetDropdown()
        this.renderDiagramCatalog()

        this.diagramStudio = new CloudQubesDiagramStudio(this.diagramCanvasTarget, {
          onSelectionChange: (el) => this.handleDiagramSelectionChange(el),
          onConnectStep: (step) => this.handleDiagramConnectStep(step),
          onElementDoubleClick: (el) => {
            this.handleDiagramSelectionChange(el)
            if (this.hasDiagramNodeLabelTarget) {
              this.diagramNodeLabelTarget.focus()
              this.diagramNodeLabelTarget.select()
            }
          }
        })
        if (!this.activeDiagramEditingUrl) {
          this.diagramStudio.loadTemplate("three_tier")
        }
        setTimeout(() => this.diagramStudio?.zoomFit?.(), 80)
        if (this.hasDiagramStatusTextTarget) {
          this.diagramStatusTextTarget.textContent = `Ready · ${this.cloudCatalog.length} Cloud & K8s icons loaded · Powered by diagram-js (MIT)`
        }
      } catch (err) {
        console.error("Failed to initialize diagram-js studio:", err)
        if (this.hasDiagramStatusTextTarget) {
          this.diagramStatusTextTarget.textContent = `Error loading diagram engine: ${err.message || err}`
        }
      }
    } else if (this.diagramStudio) {
      setTimeout(() => this.diagramStudio?.zoomFit?.(), 80)
    }
  }

  selectDiagramProviderTab(event) {
    event?.preventDefault?.()
    const btn = event.currentTarget
    this.activeCatalogProvider = btn.dataset.provider || "all"

    if (this.hasDiagramProviderTabsTarget) {
      const buttons = this.diagramProviderTabsTarget.querySelectorAll("button[data-provider]")
      buttons.forEach(b => {
        if (b.dataset.provider === this.activeCatalogProvider) {
          b.className = "px-1.5 py-1 rounded-lg text-[10px] font-bold text-slate-900 bg-white shadow-2xs transition-all cursor-pointer text-center"
        } else {
          b.className = "px-1.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-all cursor-pointer text-center"
        }
      })
    }

    this.renderDiagramCatalog()
  }

  filterDiagramCatalog() {
    this.renderDiagramCatalog()
  }

  renderDiagramCatalog() {
    if (!this.hasDiagramCatalogListTarget || !this.cloudCatalog) return

    const rawQuery = this.hasDiagramCatalogSearchTarget ? this.diagramCatalogSearchTarget.value.trim().toLowerCase() : ""
    const activeProvider = this.activeCatalogProvider || "all"

    const matchesQuery = (item) => {
      if (!rawQuery) return true
      const haystack = `${item.label} ${item.subtitle} ${item.provider} ${item.category} ${item.keywords || ""}`.toLowerCase()
      return rawQuery.split(/\s+/).every(token => haystack.includes(token))
    }

    let items = this.cloudCatalog.filter(item => {
      const providerMatch = activeProvider === "all" || item.provider === activeProvider
      return providerMatch && matchesQuery(item)
    })

    // If user typed a search query while inside a specific tab that has 0 results, fall back to searching across all providers
    let crossProviderFallback = false
    if (items.length === 0 && rawQuery && activeProvider !== "all") {
      items = this.cloudCatalog.filter(matchesQuery)
      crossProviderFallback = items.length > 0
    }

    if (items.length === 0) {
      this.diagramCatalogListTarget.innerHTML = `
        <div class="p-4 text-center rounded-xl bg-white border border-slate-200/80 text-xs text-slate-500">
          No cloud services matching "<strong>${this.escapeHtml(rawQuery)}</strong>".
        </div>
      `
      return
    }

    const providerLabels = {
      general: "Core Architecture Shapes",
      aws: "Amazon Web Services (AWS)",
      gcp: "Google Cloud Platform (GCP)",
      azure: "Microsoft Azure",
      k8s: "Kubernetes (K8s)"
    }

    const providerBadges = {
      aws: `<span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">AWS</span>`,
      gcp: `<span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">GCP</span>`,
      azure: `<span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200">AZURE</span>`,
      k8s: `<span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">K8S</span>`,
      general: ""
    }

    // Group by category (when a single provider is active) or by provider (when 'all' is active)
    const groups = new Map()
    items.forEach(item => {
      const groupKey = activeProvider === "all" || crossProviderFallback
        ? (providerLabels[item.provider] || item.provider.toUpperCase())
        : item.category
      if (!groups.has(groupKey)) groups.set(groupKey, [])
      groups.get(groupKey).push(item)
    })

    let html = ""
    if (crossProviderFallback) {
      html += `<div class="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">Showing matches across all providers</div>`
    }

    for (const [groupTitle, groupItems] of groups.entries()) {
      html += `
        <div>
          <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">
            <span>${this.escapeHtml(groupTitle)}</span>
            <span class="text-[9px] font-semibold text-slate-400">${groupItems.length}</span>
          </div>
          <div class="grid grid-cols-1 gap-1.5">
      `

      groupItems.forEach(item => {
        const svgHtml = this.getCatalogIconSvg ? this.getCatalogIconSvg(item.iconKey, item.shapeType) : ""
        const badgeHtml = providerBadges[item.provider] || ""
        const isGroup = item.shapeType === "group"

        html += `
          <button type="button"
                  draggable="true"
                  data-action="click->zenmark-editor#addDiagramNode dragstart->zenmark-editor#handleCatalogItemDragStart"
                  data-catalog-id="${this.escapeHtml(item.id)}"
                  data-shape-type="${this.escapeHtml(item.shapeType)}"
                  data-default-label="${this.escapeHtml(item.label)}"
                  data-default-sub="${this.escapeHtml(item.subtitle)}"
                  data-default-theme="${this.escapeHtml(item.theme)}"
                  data-provider="${this.escapeHtml(item.provider)}"
                  data-icon-key="${this.escapeHtml(item.iconKey)}"
                  data-icon-color="${this.escapeHtml(item.iconColor)}"
                  class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100/80 border ${isGroup ? 'border-dashed border-slate-300' : 'border-slate-200/90'} shadow-2xs transition-all cursor-pointer text-left group">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                  style="background-color: ${this.escapeHtml(item.iconColor || '#475569')};">
              ${svgHtml}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1">
                <span class="leading-tight truncate text-slate-800">${this.escapeHtml(item.label)}</span>
                ${badgeHtml}
              </div>
              <div class="text-[10px] font-normal text-slate-400 truncate">${this.escapeHtml(item.subtitle)}</div>
            </div>
          </button>
        `
      })

      html += `
          </div>
        </div>
      `
    }

    this.diagramCatalogListTarget.innerHTML = html
  }

  populateDiagramPresetDropdown() {
    if (!this.hasDiagramNodePresetSelectTarget || !this.cloudCatalog) return

    const providerNames = {
      general: "Classic Shapes",
      aws: "Amazon Web Services (AWS)",
      gcp: "Google Cloud Platform (GCP)",
      azure: "Microsoft Azure",
      k8s: "Kubernetes (K8s)"
    }

    const grouped = new Map()
    this.cloudCatalog.forEach(item => {
      if (item.shapeType === "group") return
      const g = providerNames[item.provider] || item.provider
      if (!grouped.has(g)) grouped.set(g, [])
      grouped.get(g).push(item)
    })

    let optionsHtml = `<option value="">Custom / Keep Current</option>`
    for (const [groupLabel, items] of grouped.entries()) {
      optionsHtml += `<optgroup label="${this.escapeHtml(groupLabel)}">`
      items.forEach(item => {
        optionsHtml += `<option value="${this.escapeHtml(item.id)}">${this.escapeHtml(item.label)} (${this.escapeHtml(item.subtitle)})</option>`
      })
      optionsHtml += `</optgroup>`
    }

    this.diagramNodePresetSelectTarget.innerHTML = optionsHtml
  }

  escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  closeDiagramModal(event) {
    event?.preventDefault?.()
    if (this.hasDiagramDialogTarget) {
      this.diagramDialogTarget.classList.add("hidden")
    }
    if (this.diagramStudio) {
      this.diagramStudio.cancelTwoClickConnect()
      this.resetDiagramConnectUI()
    }
    this.activeDiagramEditingUrl = null
    this.activeDiagramEditingAlt = null
    if (this.hasDiagramInsertLabelTarget) {
      this.diagramInsertLabelTarget.textContent = "Insert Diagram"
    }
  }

  closeDiagramModalOnBackdrop(event) {
    if (event.target === this.diagramDialogTarget) {
      this.closeDiagramModal(event)
    }
  }

  loadDiagramTemplate(event) {
    if (!this.diagramStudio) return
    const template = event?.currentTarget?.value || "three_tier"
    this.diagramStudio.loadTemplate(template)
  }

  addDiagramNode(event) {
    event?.preventDefault?.()
    if (!this.diagramStudio) return

    const btn = event.currentTarget
    const shapeType = btn.dataset.shapeType || "service"
    const label = btn.dataset.defaultLabel || "Service"
    const subtitle = btn.dataset.defaultSub || "Compute"
    const theme = btn.dataset.defaultTheme || "slate"
    const provider = btn.dataset.provider || ""
    const iconKey = btn.dataset.iconKey || ""
    const iconColor = btn.dataset.iconColor || ""

    this.diagramStudio.addNode({ shapeType, label, subtitle, theme, provider, iconKey, iconColor })
  }

  handleCatalogItemDragStart(event) {
    const btn = event.currentTarget
    const payload = {
      shapeType: btn.dataset.shapeType || "service",
      label: btn.dataset.defaultLabel || "Service",
      subtitle: btn.dataset.defaultSub || "Compute",
      theme: btn.dataset.defaultTheme || "slate",
      provider: btn.dataset.provider || "",
      iconKey: btn.dataset.iconKey || "",
      iconColor: btn.dataset.iconColor || ""
    }
    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData("application/x-zenmark-node", JSON.stringify(payload))
  }

  handleDiagramCanvasDragOver(event) {
    if (event.dataTransfer?.types?.includes("application/x-zenmark-node")) {
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    }
  }

  handleDiagramCanvasDrop(event) {
    const raw = event.dataTransfer?.getData("application/x-zenmark-node")
    if (!raw || !this.diagramStudio) return

    event.preventDefault()
    try {
      const payload = JSON.parse(raw)
      const coords = this.diagramStudio.clientToCanvasCoords(event.clientX, event.clientY)
      const w = payload.shapeType === "group" ? 480 : payload.iconKey ? 196 : 172
      const h = payload.shapeType === "group" ? 260 : 76
      this.diagramStudio.addNode({
        ...payload,
        x: Math.round(coords.x - w / 2),
        y: Math.round(coords.y - h / 2)
      })
    } catch (err) {
      console.error("Failed to drop catalog node onto diagram canvas:", err)
    }
  }

  startDiagramConnectMode(event) {
    event?.preventDefault?.()
    if (!this.diagramStudio) return

    this.diagramStudio.startTwoClickConnect()
    if (this.hasDiagramConnectHintTarget) {
      this.diagramConnectHintTarget.classList.remove("hidden")
    }
    if (this.hasDiagramConnectHintTextTarget) {
      this.diagramConnectHintTextTarget.textContent = "Step 1: Click the source node on the canvas"
    }
    if (this.hasDiagramConnectModeBtnTarget) {
      this.diagramConnectModeBtnTarget.classList.add("border-[#C21057]", "text-[#C21057]", "bg-rose-50/40")
    }
  }

  handleDiagramConnectStep(step) {
    if (step === "target") {
      if (this.hasDiagramConnectHintTextTarget) {
        this.diagramConnectHintTextTarget.textContent = "Step 2: Now click the target node to complete the arrow"
      }
    } else {
      this.resetDiagramConnectUI()
    }
  }

  resetDiagramConnectUI() {
    if (this.hasDiagramConnectHintTarget) {
      this.diagramConnectHintTarget.classList.add("hidden")
    }
    if (this.hasDiagramConnectModeBtnTarget) {
      this.diagramConnectModeBtnTarget.classList.remove("border-[#C21057]", "text-[#C21057]", "bg-rose-50/40")
    }
  }

  handleDiagramSelectionChange(el) {
    this.selectedDiagramElement = el

    if (!el) {
      if (this.hasDiagramNoSelectionTarget) this.diagramNoSelectionTarget.classList.remove("hidden")
      if (this.hasDiagramInspectorTarget) this.diagramInspectorTarget.classList.add("hidden")
      return
    }

    if (this.hasDiagramNoSelectionTarget) this.diagramNoSelectionTarget.classList.add("hidden")
    if (this.hasDiagramInspectorTarget) this.diagramInspectorTarget.classList.remove("hidden")

    const isConnection = Boolean(el.waypoints)
    const isGroup = el.shapeType === "group"

    if (this.hasDiagramNodeLabelTarget) {
      this.diagramNodeLabelTarget.value = el.nodeTitle || ""
      this.diagramNodeLabelTarget.placeholder = isConnection ? "e.g. HTTPS / gRPC / Async" : "e.g. Cloud SQL Primary"
    }
    if (this.hasDiagramNodeSubWrapperTarget) {
      this.diagramNodeSubWrapperTarget.classList.toggle("hidden", isConnection)
    }
    if (this.hasDiagramNodePresetWrapperTarget) {
      this.diagramNodePresetWrapperTarget.classList.toggle("hidden", isConnection || isGroup)
    }
    if (this.hasDiagramNodeThemeWrapperTarget) {
      this.diagramNodeThemeWrapperTarget.classList.toggle("hidden", isConnection)
    }
    if (!isConnection && this.hasDiagramNodeSubTarget) {
      this.diagramNodeSubTarget.value = el.subtitle || ""
    }
    if (!isConnection && !isGroup && this.hasDiagramNodePresetSelectTarget && this.cloudCatalog) {
      const matched = this.cloudCatalog.find(item =>
        (el.iconKey && item.iconKey === el.iconKey && item.provider === el.provider) ||
        (!el.iconKey && item.provider === "general" && item.shapeType === el.shapeType)
      )
      this.diagramNodePresetSelectTarget.value = matched ? matched.id : ""
    }
  }

  updateSelectedDiagramElement() {
    if (!this.diagramStudio || !this.selectedDiagramElement) return
    const label = this.hasDiagramNodeLabelTarget ? this.diagramNodeLabelTarget.value : ""
    const subtitle = this.hasDiagramNodeSubTarget ? this.diagramNodeSubTarget.value : ""

    if (this.selectedDiagramElement.waypoints) {
      this.diagramStudio.updateElement(this.selectedDiagramElement, { label })
    } else {
      this.diagramStudio.updateElement(this.selectedDiagramElement, { label, subtitle })
    }
  }

  changeSelectedDiagramNodePreset(event) {
    if (!this.diagramStudio || !this.selectedDiagramElement || !this.cloudCatalog) return
    const presetId = event.currentTarget.value
    const item = this.cloudCatalog.find(c => c.id === presetId)
    if (!item) return

    this.selectedDiagramElement.shapeType = item.shapeType
    this.diagramStudio.updateElement(this.selectedDiagramElement, {
      provider: item.provider,
      iconKey: item.iconKey,
      iconColor: item.iconColor,
      theme: item.theme,
      subtitle: item.subtitle
    })
    if (this.hasDiagramNodeSubTarget) {
      this.diagramNodeSubTarget.value = item.subtitle
    }
  }

  setDiagramElementTheme(event) {
    event?.preventDefault?.()
    if (!this.diagramStudio || !this.selectedDiagramElement) return
    const theme = event.currentTarget.dataset.theme || "slate"
    this.diagramStudio.updateElement(this.selectedDiagramElement, { theme })
  }

  duplicateSelectedDiagramElement(event) {
    event?.preventDefault?.()
    if (!this.diagramStudio || !this.selectedDiagramElement) return
    this.diagramStudio.duplicateElement(this.selectedDiagramElement)
  }

  deleteSelectedDiagramElement(event) {
    event?.preventDefault?.()
    if (!this.diagramStudio || !this.selectedDiagramElement) return
    this.diagramStudio.deleteElement(this.selectedDiagramElement)
  }

  diagramUndo(event) {
    event?.preventDefault?.()
    this.diagramStudio?.undo()
  }

  diagramRedo(event) {
    event?.preventDefault?.()
    this.diagramStudio?.redo()
  }

  diagramZoomIn(event) {
    event?.preventDefault?.()
    this.diagramStudio?.zoomIn()
  }

  diagramZoomOut(event) {
    event?.preventDefault?.()
    this.diagramStudio?.zoomOut()
  }

  diagramZoomReset(event) {
    event?.preventDefault?.()
    this.diagramStudio?.zoomFit()
  }

  clearDiagramCanvas(event) {
    event?.preventDefault?.()
    this.diagramStudio?.clear()
  }

  async insertDiagramIntoMarkdown(event) {
    event?.preventDefault?.()
    if (!this.diagramStudio) return

    const title = (this.hasDiagramTitleTarget ? this.diagramTitleTarget.value.trim() : "") || "Architecture Diagram"
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "architecture-diagram"
    const filename = `${slug}-${Date.now()}.svg`

    if (this.hasDiagramInsertBtnTarget) this.diagramInsertBtnTarget.disabled = true
    if (this.hasDiagramInsertLabelTarget) {
      this.diagramInsertLabelTarget.textContent = this.activeDiagramEditingUrl ? "Updating..." : "Rendering & Uploading..."
    }

    try {
      // Export self-contained SVG with embedded JSON metadata for full re-editing
      const svgBlob = this.diagramStudio.exportToSvgBlob(title, true)
      const file = new File([svgBlob], filename, { type: "image/svg+xml" })

      const formData = new FormData()
      formData.append("file", file)
      if (this.hasSgidValue && this.sgidValue) {
        formData.append("sgid", this.sgidValue)
      }

      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
      const response = await fetch("/zenmark/images", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {})
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`)
      }

      const data = await response.json()
      const imageUrl = data.url || `/rails/active_storage/blobs/${data.signed_id}/${filename}`
      const newMdImage = `![${title}](${imageUrl})`

      const editingUrl = this.activeDiagramEditingUrl
      this.closeDiagramModal()

      if (editingUrl && this.textarea) {
        // Replace existing diagram markdown with updated diagram
        const text = this.textarea.value
        const escapedUrl = editingUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const regex = new RegExp(`!\\[[^\\]]*\\]\\(${escapedUrl}\\)`, "g")
        if (regex.test(text)) {
          this.textarea.value = text.replace(regex, newMdImage)
        } else {
          this.restoreSelection()
          this.insertAtCursor(`\n${newMdImage}\n`)
        }
        this.activeDiagramEditingUrl = null
        this.activeDiagramEditingAlt = null
        this.showToast("Architecture diagram updated!")
      } else {
        this.restoreSelection()
        this.insertAtCursor(`\n${newMdImage}\n`)
        this.showToast("Architecture diagram inserted!")
      }

      this.updateStats()
      if (this.currentMode === "split" || this.currentMode === "preview") {
        this.scheduleLivePreview()
      }
    } catch (err) {
      console.error("Diagram export/upload failed:", err)
      this.showToast(err.message || "Failed to insert diagram", true)
    } finally {
      if (this.hasDiagramInsertBtnTarget) this.diagramInsertBtnTarget.disabled = false
      if (this.hasDiagramInsertLabelTarget) {
        this.diagramInsertLabelTarget.textContent = this.activeDiagramEditingUrl ? "Update Diagram" : "Insert Diagram"
      }
    }
  }

  // --- Re-Editing Diagrams from Markdown Preview & File Import/Export ---

  triggerDiagramFileInput(event) {
    event?.preventDefault?.()
    if (this.hasDiagramFileInputTarget) {
      this.diagramFileInputTarget.click()
    }
  }

  async importDiagramFile(event) {
    const file = event?.target?.files?.[0]
    if (!file || !this.diagramStudio) return

    try {
      const text = await file.text()
      let state = null

      if (file.name.endsWith(".json")) {
        state = JSON.parse(text)
      } else {
        if (!this.extractDiagramStateFromSvg) {
          const mod = await import("zenmark_diagram")
          this.extractDiagramStateFromSvg = mod.extractDiagramStateFromSvg
        }
        state = this.extractDiagramStateFromSvg(text)
      }

      if (!state) {
        throw new Error("Could not find valid diagram data in this file")
      }

      this.diagramStudio.loadJSON(state)
      if (this.hasDiagramTitleTarget && state.title) {
        this.diagramTitleTarget.value = state.title
      }
      this.showToast(`Imported ${file.name}!`)
    } catch (err) {
      console.error("Failed to import diagram file:", err)
      this.showToast(err.message || "Failed to import file", true)
    } finally {
      if (event?.target) event.target.value = ""
    }
  }

  downloadDiagramSvg(event) {
    event?.preventDefault?.()
    if (!this.diagramStudio) return

    try {
      const title = (this.hasDiagramTitleTarget ? this.diagramTitleTarget.value.trim() : "") || "Architecture Diagram"
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "architecture-diagram"
      const svgBlob = this.diagramStudio.exportToSvgBlob(title, true)
      const url = URL.createObjectURL(svgBlob)

      const a = document.createElement("a")
      a.href = url
      a.download = `${slug}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      this.showToast("Exported editable SVG!")
    } catch (err) {
      console.error("Download failed:", err)
      this.showToast(err.message || "Failed to export SVG", true)
    }
  }

  attachDiagramEditBadgesInPreview() {
    if (!this.hasPreviewAreaTarget) return

    const images = this.previewAreaTarget.querySelectorAll("img")
    images.forEach(img => {
      const src = img.getAttribute("src") || ""
      const isCandidate = src.endsWith(".svg") || src.includes("active_storage") || src.includes("diagram")
      if (!isCandidate) return

      if (img.closest(".zenmark-diagram-figure")) return

      const figure = document.createElement("span")
      figure.className = "zenmark-diagram-figure"
      img.parentNode.insertBefore(figure, img)
      figure.appendChild(img)

      const editBtn = document.createElement("button")
      editBtn.type = "button"
      editBtn.className = "zenmark-diagram-edit-badge"
      editBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">edit</span><span>Edit Diagram</span>'
      editBtn.title = "Edit this architecture diagram in Studio"

      editBtn.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.editDiagramFromImageUrl(img.src, img.alt)
      })

      img.addEventListener("dblclick", (e) => {
        e.preventDefault()
        this.editDiagramFromImageUrl(img.src, img.alt)
      })

      figure.appendChild(editBtn)
    })
  }

  async editDiagramFromImageUrl(imageUrl, alt = '') {
    if (!imageUrl) return

    try {
      this.showToast("Loading diagram data...")
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch diagram SVG (${response.status})`)
      }
      const svgText = await response.text()

      if (!this.extractDiagramStateFromSvg) {
        const mod = await import("zenmark_diagram")
        this.extractDiagramStateFromSvg = mod.extractDiagramStateFromSvg
      }

      const state = this.extractDiagramStateFromSvg(svgText)
      if (!state) {
        this.showToast("This image does not contain editable diagram data", true)
        return
      }

      this.activeDiagramEditingUrl = imageUrl
      this.activeDiagramEditingAlt = alt
      await this.openDiagramModal()

      if (this.hasDiagramTitleTarget) {
        this.diagramTitleTarget.value = state.title || alt || "Cloud Architecture Diagram"
      }

      if (this.diagramStudio) {
        this.diagramStudio.loadJSON(state)
      }

      if (this.hasDiagramInsertLabelTarget) {
        this.diagramInsertLabelTarget.textContent = "Update Diagram"
      }

      this.showToast("Diagram loaded for editing!")
    } catch (err) {
      console.error("Failed to load diagram for editing:", err)
      this.showToast(err.message || "Failed to load diagram", true)
    }
  }
}
