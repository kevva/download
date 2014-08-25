'use strict';

var events = require('events');
var util = require('util');


function Segment(offset, length){

    events.EventEmitter.call(this);

    this.offset = offset || 0;
    this.length = length || 0;
    this.downloadedLength = 0;
    this.finished = false;
    this.assigned = false;
}

util.inherits(Segment, events.EventEmitter);

Segment.prototype.getProgress = function(){

    var self = this;

    if(self.length > 0){
        return ((self.downloadedLength / self.length) * 100).toFixed(2);
    }else{
        return 0;
    }

};

Segment.prototype.getRemainingLength = function(){

    var self = this;

    if(self.length > 0){
        return self.length - self.downloadedLength;
    }else{
        return 0;
    }
};


module.exports = Segment;