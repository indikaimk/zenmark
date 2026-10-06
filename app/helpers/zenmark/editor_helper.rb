# frozen_string_literal: true

module Zenmark
  module EditorHelper
    def zenmark_editor(form, field, image_upload_url = nil, options = {})
      sgid = form.object.respond_to?(:to_sgid) && form.object.persisted? ? form.object.to_sgid.to_s : nil

      content_tag :div, class: "zenmark-editor", data: {
        controller: "zenmark-editor",
        "zenmark-editor-image-upload-url-value": image_upload_url,
        "zenmark-editor-sgid-value": sgid
      } do
        safe_join([
          render("zenmark/toolbar"),
          render("zenmark/link_dialog"),
          render("zenmark/image_dialog"),

          # Hidden file input for image picker
          file_field_tag(:file,
            style: "display: none;",
            accept: "image/*",
            data: {
              "zenmark-editor-target" => "fileInput",
              action: "change->zenmark-editor#uploadImage"
            }
          ),

          # Workspace containing Editor Pane + Live Preview Pane
          content_tag(:div, class: "zenmark-workspace zenmark-mode-write", data: { "zenmark-editor-target" => "workspace" }) do
            safe_join([
              # Textarea Pane
              content_tag(:div, class: "zenmark-editor-pane", data: { "zenmark-editor-target" => "editorPane" }) do
                form.text_area(field,
                  class: "zenmark-textarea",
                  placeholder: options[:placeholder] || "Write your content here in Markdown...",
                  data: {
                    "zenmark-editor-target": "mdtextarea",
                    action: "input->zenmark-editor#onInput keydown->zenmark-editor#onKeydown paste->zenmark-editor#handlePaste dragover->zenmark-editor#handleDragOver dragleave->zenmark-editor#handleDragLeave drop->zenmark-editor#handleDrop"
                  }
                )
              end,

              # Live / Full Preview Pane
              content_tag(:div, class: "zenmark-preview-pane", data: { "zenmark-editor-target" => "previewPane" }) do
                content_tag(:div, "", id: "zenmark-preview", class: "zenmark-preview-content", data: { "zenmark-editor-target" => "previewArea" })
              end
            ])
          end,

          # Status Bar
          content_tag(:div, class: "zenmark-status-bar") do
            content_tag(:div, class: "flex items-center justify-between text-xs text-slate-500 px-4 py-2 bg-slate-50 border-t border-slate-200") do
              safe_join([
                content_tag(:div, class: "flex items-center gap-3") do
                  safe_join([
                    content_tag(:span, "0 words", class: "font-semibold text-slate-700", data: { "zenmark-editor-target" => "wordCount" }),
                    content_tag(:span, "·", class: "text-slate-300"),
                    content_tag(:span, "0 chars", class: "text-slate-500", data: { "zenmark-editor-target" => "charCount" }),
                    content_tag(:span, "·", class: "text-slate-300"),
                    content_tag(:span, "0 min read", class: "text-slate-500", data: { "zenmark-editor-target" => "readingTime" }),
                  ])
                end,
                content_tag(:div, class: "hidden sm:flex items-center gap-2 text-[11px] text-slate-400 select-none") do
                  safe_join([
                    content_tag(:span, "Markdown"),
                    content_tag(:span, "·", class: "text-slate-300"),
                    content_tag(:span, "⌘S Save", class: "font-mono bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600"),
                    content_tag(:span, "⌘B Bold", class: "font-mono bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600"),
                    content_tag(:span, "⌘K Link", class: "font-mono bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600")
                  ])
                end
              ])
            end
          end,

          content_tag(:div, "", class: "zenmark-toast hidden", data: { "zenmark-editor-target" => "toast" })
        ])
      end
    end
  end
end
