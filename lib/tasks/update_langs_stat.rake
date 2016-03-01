
require "#{File.dirname(__FILE__)}/langs_stat.rb"

task :update_langs_stat => :environment do
  datafile = 'langs_stat.json'

  LangsStat.update_repo_langs_data(datafile)
  puts 'done update.'
end
