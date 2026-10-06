# frozen_string_literal: true

module Zenmark
  class PreviewsController < ApplicationController
    skip_before_action :verify_authenticity_token, raise: false

    def create
      content = params[:content].to_s
      rendered_html = helpers.render_markdown(content)

      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.update(
            "zenmark-preview",
            partial: "zenmark/preview",
            locals: { content: content }
          )
        end
        format.html { render html: rendered_html.html_safe }
        format.json { render json: { html: rendered_html } }
        format.text { render plain: rendered_html }
      end
    end
  end
end
