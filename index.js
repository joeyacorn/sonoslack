sonos = require('sonos');
request = require("request");
randomColor = require("randomcolor");
fs = require('fs');
request = require('request');
imgur = require('imgur');
twitter = require('twitter');
albumArt = require('album-art');

config = require('./config.json');

lastArtist = null;
lastTitle = null;
isBroke = false;

mySonos = null;
mySonos = new sonos.Sonos(config.sonosIpAddress);

// setup twitter
client = new twitter({
  consumer_key: 'O3xZjGJY3U1GC8IIUJ3Le1tHa',
  consumer_secret: 'BGEKhnaHA0uXQxlrDtZdQccuOngujXQ2dzO3IzE37CzhUalE6q',
  access_token_key: '709412668948488192-1QckUBds2zWcm3FNsqFWFMz9biBbbkO',
  access_token_secret: 'MCFUUtoyxnsW8twJwKSg3ElTY4Ju3jBVvUiJar6O6GONf'
});

download = function(uri, filename, artist, tracktitle, callback) {

  request.head(uri, function(err, res, body) {

    if (!err) {

      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);

    } else {

      err = null;
      // attempt to get it from lastfm
      albumArt(artist, tracktitle, 'large', function (err, lastFMURL) {
        console.log("got from lastFM:" + lastFMURL);
        
        request.head(lastFMURL, function(err, res, body) {

          if (!err) {

            request(lastFMURL).pipe(fs.createWriteStream(filename)).on('close', callback);

          } else {

            console.log("cannot get image");
            callback(err);

          }

        });


      });

    }

  });

};

checkSong = function() {

  mySonos.currentTrack(function(err, track) {

    if(!err && !track) {

      isBroke = true;
      console.error("Error connecting to Sonos: " + err);

    } else if(track.artist != lastArtist || track.title != lastTitle) {

      postSong(track);

    }


  });

};
  


postSong = function(track) {

  isBroke = false;
  albumArtURL = track.albumArtURL;
  lastArtist = track.artist;
  lastTitle = track.title;
  oneLiner = track.artist + " - " + track.title;

  console.log(oneLiner);

  if(! track.artist || ! track.title)
      return;

  download(albumArtURL, "./art.png", track.artist, track.title, function(error) {

    if(!error) {

      var imageData = require('fs').readFileSync('art.png');

      // send to twitter with album art link
      tweetBody = config.officeName + ": " + track.artist + ": " + track.title + " ";

      client.post('media/upload', {media: imageData}, function(error, media, response) {

        if (error) {

          throw error;

        } else {

          var status = {
            status: tweetBody,
            media_ids: media.media_id_string // Pass the media id string
          };

          client.post('statuses/update', status, function(error, tweet, response){
            
          });

        }

      });

    } else {

      // send to twitter without album art link
      tweetBody = config.officeName + ": " + track.artist + ": " + track.title + " ";

      client.post('statuses/update', {status: tweetBody}, function(error, tweet, response) {

        if (error) {

	    console.log("Error posting tweet");

        }

      });

    }

  });

};
  
checkSong();
setInterval(checkSong, 5000);
