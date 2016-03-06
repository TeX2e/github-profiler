
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
    # create the array of hashes
    #   [
    #     { :name, :url, :langs },
    #     { :name, :url, :langs }, ...
    #   ]
    repos = []

    # github API via Octokit (ruby gem)
    if File.exist?('github_access_token')
      access_token = File.read('github_access_token').chomp
    elsif ENV['GITHUB_ACCESS_TOKEN']
      access_token = ENV['GITHUB_ACCESS_TOKEN']
    end
    client = Octokit::Client.new(access_token: access_token);

    # take each repositories infomation
    # create threads to do parallel processing
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
  def self.convert_to_langs_stat(repos)
    # create a hash from self.repos_lang_loc()
    #   {
    #     'Language': [
    #       { :name, :url, :loc },
    #       { :name, :url, :loc }, ...
    #     ],
    #     'Language': [
    #       ...
    #     ],
    #   }
    langs_stat = {}
    repos.each do |repo|
      repo_name = repo[:name]
      repo_url  = repo[:url]

      repo[:langs].each do |lang, loc|
        langs_stat[lang] || langs_stat[lang] = []
        langs_stat[lang].push({
          name: repo_name,
          url:  repo_url,
          loc:  loc,
        })
      end
    end

    langs_stat
  end
end
