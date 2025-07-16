require_relative "lib/zenmark/version"

Gem::Specification.new do |spec|
  spec.name        = "zenmark"
  spec.version     = Zenmark::VERSION
  spec.authors     = [ "Indika" ]
  spec.email       = [ "cloud.qubes@gmail.com" ]
  spec.homepage    = "https://github.com/indikaimk/zenmark"
  spec.summary     = "Summary of Zenmark."
  spec.description = "Description of Zenmark."
  spec.license     = "MIT"

  # Prevent pushing this gem to RubyGems.org. To allow pushes either set the "allowed_push_host"
  # to allow pushing to a single host or delete this section to allow pushing to any host.
  spec.metadata["allowed_push_host"] = "Set to 'http://mygemserver.com'"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/indikaimk/zenmark"
  spec.metadata["changelog_uri"] = "https://github.com/indikaimk/zenmark/CHANGELOG.md"

  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    Dir["{app,config,db,lib}/**/*", "MIT-LICENSE", "Rakefile", "README.md"]
  end

  spec.add_dependency "rails", ">= 8.0.2"
  spec.add_dependency "redcarpet"
  spec.add_dependency "activestorage"
  spec.add_dependency "turbo-rails"
end
