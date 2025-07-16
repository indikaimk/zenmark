module Zenmark
  class PreviewsController < ApplicationController
    def create
      render turbo_stream: turbo_stream.update(
        "zenmark-preview",
        partial: "zenmark/preview",
        locals: { content: params[:content] }
      )
    end
  end
end
