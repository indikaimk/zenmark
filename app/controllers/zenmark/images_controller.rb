# frozen_string_literal: true

module Zenmark
  class ImagesController < ApplicationController
    skip_before_action :verify_authenticity_token, raise: false

    def create
      file = params[:file]
      if file.blank?
        render json: { error: "No file provided" }, status: :unprocessable_entity
        return
      end

      blob = ActiveStorage::Blob.create_and_upload!(
        io: file,
        filename: file.original_filename,
        content_type: file.content_type
      )

      if params[:sgid].present?
        begin
          record = GlobalID::Locator.locate_signed(params[:sgid])
          if record && record.respond_to?(:content_images)
            record.content_images.attach(blob)
          end
        rescue => e
          Rails.logger.warn("Zenmark image sgid attachment failed: #{e.message}")
        end
      end

      url = begin
        Rails.application.routes.url_helpers.rails_blob_path(blob, only_path: true)
      rescue StandardError => e
        "/rails/active_storage/blobs/proxy/#{blob.signed_id}/#{ERB::Util.url_encode(blob.filename.to_s)}"
      end

      render json: {
        signed_id: blob.signed_id,
        url: url,
        filename: blob.filename.to_s
      }
    rescue => e
      Rails.logger.error("Zenmark image upload failed: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
