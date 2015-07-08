var Player = require('./Player');
var Delay  = require('./Delay');

/**
 * @classdesc
 * Manages the update of a list of playable with respect to a given elapsed time.
 */
function Tweener() {
	Player.call(this);

	// A tweener has no end and never completes
	this._duration = Infinity;

	// TINA is the player for all the tweeners
	this._player = TINA;
}
Tweener.prototype = Object.create(Player.prototype);
Tweener.prototype.constructor = Tweener;
module.exports = Tweener;

Tweener.prototype._finish = function (playable) {
	// In a tweener, a playable that finishes is simply removed
	playable._handle = this._playablesToRemove.add(playable._handle);
};

Tweener.prototype.stop = function () {
	// Stopping all active playables and removing them right away
	while (this._activePlayables.length > 0) {
		var playable = this._activePlayables.pop();
		playable._handle = null;
		playable.stop();
	}

	this._handlePlayableToRemove();

	this._stop();
	return this;
};

Tweener.prototype._moveTo = function (time, dt) {
	this._time = this._getElapsedTime(time - this._startTime);
	dt = this._getSingleStepDuration(dt);

	// Computing time overflow and clamping time
	var overflow;
	if (dt > 0) {
		if (this._time >= this._duration) {
			overflow = this._time - this._duration;
			dt -= overflow;
			this._time = this._duration;
		}
	} else if (dt < 0) {
		if (this._time <= 0) {
			overflow = this._time;
			dt -= overflow;
			this._time = 0;
		}
	}

	this._handlePlayablesToRemove();

	// Inactive playables are set as active
	while (this._inactivePlayables.length > 0) {
		// O(1)
		playable = this._inactivePlayables.pop();
		playable._handle = this._activePlayables.add(playable);
	}

	for (var handle = this._activePlayables.first; handle !== null; handle = handle.next) {
		handle.object._moveTo(this._time, dt);
	}

	if (this._onUpdate !== null) {
		this._onUpdate(this._time, dt);
	}

	if (overflow !== undefined) {
		this._complete(overflow);
	}
};

Tweener.prototype._delay = function (playable, delay) {
	if (delay <= 0) {
		this._warn('[Tweener.add] Delay null or negative (' + delay + ').' +
			'Starting the playable with a delay of 0.');
		playable.start();
		return;
	}

	var delayPlayable = new Delay(delay);
	delayPlayable.tweener(this).onComplete(function (timeOverflow) {
		playable.start(timeOverflow);
	}).start();
};