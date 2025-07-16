module Zenmark
  class ImagesController < ApplicationController
    def create
      blob = ActiveStorage::Blob.create_and_upload!(
        io: params[:file],
        filename: params[:file].original_filename,
        content_type: params[:file].content_type
      )
      render json: { signed_id: blob.signed_id }
    end
  end
end
