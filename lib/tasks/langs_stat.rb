
module LangsStat
  def self.update_repo_langs_data(filename_json)
    # get repositories languages
    repos = repos_lang_loc.sort_by { |elem| elem[:name] }
    langs_stat = convert_to_langs_stat(repos)

    # dump to filename_json
    #File.open('langs_stat.json', 'w') do |file|
    File.open(filename_json, 'w') do |file|
      file.puts JSON.dump(langs_stat)
    end

    langs_stat
  end

  # extract a language LOC on github repositories
  def self.repos_lang_loc
    repos = []

    if File.exist?('github_access_token')
      access_token = File.read('github_access_token').chomp
    elsif ENV['GITHUB_ACCESS_TOKEN']
      access_token = ENV['GITHUB_ACCESS_TOKEN']
    end
    client = Octokit::Client.new(access_token: access_token);

    threads = []
    client.repos.each do |repo|
      next if repo.fork
      threads << Thread.new(repo) do |repo|
        # create a hash
        #   { :name, :url, :langs }
        repos.push({
            name:  repo.full_name, # => "TeX2e/repo"
            url:   repo.html_url,  # => "http://github.com/TeX2e/repo"
            langs: client.languages(repo.full_name), # => {:JavaScript=>58273, :HTML=>1353, :CSS=>1199}
        })
      end
    end
    threads.each { |thread| thread.join }

    repos
  end

  # convert repositories info to languages statistics
  def self.convert_to_langs_stat(repos_lang_loc)
    # create a hash
    #   {
    #     'LangName': [
    #       { :name, :loc },
    #       { :name, :loc }, ...
    #     ]
    #   }
    langs_stat = {}
    repos_lang_loc.each do |repo|
      repo_name = repo[:name]

      repo[:langs].each do |lang, loc|
        langs_stat[lang] || langs_stat[lang] = []
        langs_stat[lang].push({
          name: repo_name,
          loc:  loc,
        })
      end
    end

    langs_stat
  end
end
