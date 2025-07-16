module Zenmark
  module MarkdownHelper
    def render_markdown(text)
      markdown = Redcarpet::Markdown.new(Redcarpet::Render::HTML)
      markdown.render(text).html_safe
    end
  end
end
