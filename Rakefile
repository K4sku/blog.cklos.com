# frozen_string_literal: true

desc "Check website html integrity"
task :html_proofer do
  require "html-proofer"

  build_dir = File.join(File.dirname(__FILE__), "_site")
  `bundle exec jekyll build -d #{build_dir} -V`
  opts = {
    :url_ignore       => [%r!localhost!, /blog\.ipepe\.pl/],
    :empty_alt_ignore => true,
    :file_ignore      => [%r!slides!]
  }
  HTMLProofer.check_directory(build_dir, opts).run
end
