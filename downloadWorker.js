'use strict';

var request = require('request');
var assign = require('object-assign');
var util = require('util');
var events = require('events');


function DownloadWorker(segment, url, stream, opts){

    this.segment = segment;
    this.url = url
    this.stream = stream;
    this.opts = opts;
    this.request = null;

}

util.inherits(DownloadWorker, events.EventEmitter);

DownloadWorker.prototype.start = function(){

    var self = this;

    var interval = 2;

    if(!self.request){

        var chunkLength = 0;
        var waitForStreamDrain = false;
        var options;
        var expectedStatusCode;

        //Request with Range if the segment length is greater than 0 and the server accept range
        if(self.segment.length > 0 && self.opts.serverAcceptRange){
            options = assign({}, self.opts, {url: self.url}, {headers : { 'Range': 'bytes=' + self.segment.offset + '-' }});
            expectedStatusCode = 206;

        }else{

            options = assign({}, self.opts, {url: self.url});
            expectedStatusCode = 200;
        }

        var resCb = function(res) {

            var statusCode = res.statusCode;

            if(res.statusCode === expectedStatusCode){

                self.emit('response', res);

                self.emit('start');

                self.request.on('data', function(chunk){

                    chunkLength = chunk.length;

                    //verify the chunk length and make sure it doesn't exceed the segment size
                    if(self.segment.length === 0 ||(self.segment.downloadedLength + chunkLength) < self.segment.length){

                        waitForStreamDrain = !(self.stream.write(chunk, 'binary', null));
                        self.segment.downloadedLength += chunk.length;


                    }else{

                        //Reached end of segment, taking slice.
                        var sliceLength = (self.segment.length - self.segment.downloadedLength);

                        waitForStreamDrain = !(self.stream.write(chunk.slice(0, sliceLength), 'binary', null));
                        self.segment.downloadedLength += sliceLength;

                        self._finish();
                    }


                    //Pause when write stream needs to drain the buffer
                    if(waitForStreamDrain && self.request){

                        self.request.pause();

                        //resume when the stream finished draining the buffer
                        self.stream.once('drain', function(){
                            self.request.resume();
                        });
                    }

                });

            }else{

                self.emit('error', res);
            }

        };


        self.request = request(options)

        .on('response', resCb)

        .on('error', function(error){
            self.emit('error', error)
            })

        .on('end', function(){
            self._finish();
            });

    }else{

        self.request.resume();
    }

    return self;
};

DownloadWorker.prototype.getProgress = function(){

    var self = this;
    if(self.segment.length > 0){
        return ((self.segment.downloadedLength / self.segment.length) * 100).toFixed(2);

    }else{
        return 0;
    }

};

DownloadWorker.prototype.pause = function(){

    var self = this;

    if(self.request){
        self.request.pause();
        self.emit('pause', self);
    }

    return self;
};

DownloadWorker.prototype.resume = function(){

    var self = this;

    if(self.requset){

        self.request.resume();
        self.emit('resume', self);
    }

    return self;
};

DownloadWorker.prototype.stop = function(){

    var self = this;

    if(self.request){

        self.request.abort();
        self.request.emit('close');
        self.request.removeAllListeners('data');
        self.request = null;
        self.stream.end();
        self.emit('stop', self);
    }

    return self;
};

DownloadWorker.prototype.cancel = function(){

    var self = this;

    self.once('stop', function(){
        self.emit('cancel', self);
    })
    self.stop();

    return self;
}


//finish is call if reach end of stream or end of segment
DownloadWorker.prototype._finish = function(){

    var self = this;

    if(self.request){

        self.request.abort();
        self.request.emit('close');
        self.request.removeAllListeners('data');
        self.request = null;
        self.stream.end();
        self.emit('finish', self);
    }

};


module.exports = DownloadWorker;