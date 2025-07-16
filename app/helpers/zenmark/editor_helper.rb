module Zenmark
  module EditorHelper
    def zenmark_editor(form, field)
      content_tag :div, class: "zenmark-editor", data: { controller: 'zenmark-editor' } do
        render("zenmark/toolbar") +
        render("zenmark/link_dialog") +
        file_field_tag(:file, style: "display: none;", data: { "zenmark-editor-target" => "fileInput", action: "change->zenmark-editor#uploadImage" }) +
        form.text_area(field, data: {"zenmark-editor-target": "mdtextarea" }, class: "zenmark-textarea") +
        content_tag(:div, "", id: "zenmark-preview", data: { "zenmark-editor-target" => "previewArea" })
      end
    end
  end
end
