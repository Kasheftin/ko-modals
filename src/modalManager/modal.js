define(["jquery","underscore","knockout","config"],function($,_,ko,config) {

	var Modal = function(name,widgetOptions) {
		var self = this;
		this.name = name;
		this.options = $.extend(true,{},config.modals.default,config.modals[name]||{});
		this.modalsContainer = null;
		this.modalContent = null;
		this.modal = {
			left: ko.observable(0),
			width: ko.observable(this.options.width),
			containerWidth: ko.observable(0),
			opacity: ko.observable(this.options.flyFrom.startOpacity),
			header: ko.observable(this.options.header),
			position: ko.observable("absolute")
		}
		this.modal.restrictedWidth = ko.computed(function() {
			return Math.min(self.modal.width(),self.modal.containerWidth());
		});
		this.modalStyle = ko.computed(function() {
			var out = {};
			out.width = self.modal.restrictedWidth()+"px";
			out.left = self.modal.left()+"px";
			out.opacity = self.modal.opacity();
			out.position = self.modal.position();
			return out;
		});
		this.widgetOptions = $.extend(widgetOptions||{},{
			name:name,
			modal:this.modal,
			template: {
				afterRender: function() {
					self.show();
				}
			}
		});
		this.restrictedHeight = ko.observable(0);
		this.restrictedStyle = ko.computed(function() {
			if (self.options.animateHeight) {
				return {height:self.restrictedHeight()+"px"};
			}
			return {overflow:"auto",height:"auto"};
		});

		var runWindowWidthRestricter = function(e) {
			console.log("run");
			self.modal.containerWidth(self.modalsContainer.clientWidth||window.innerWidth);			
		}
		this.startWindowWidthRestricter = function() {
			$(window).on("resize",runWindowWidthRestricter);
		}
		this.stopWindowWidthRestricter = function() {
			$(window).off("resize",runWindowWidthRestricter);
		}
	}

	Modal.prototype.setModalsContainer = function(container) {
		this.modalsContainer = container;
	}

	Modal.prototype.setModalContent = function(content) {
		this.modalContent = content;
	}

	Modal.prototype.show = function(callback) {
		var self = this;
		var animateProperties = [];
		this.modal.containerWidth(this.modalsContainer.clientWidth||window.innerWidth);
		if (this.options.flyFrom.startOpacity||this.options.flyFrom.endOpacity) {
			animateProperties.push({
				from: this.options.flyFrom.startOpacity,
				to: this.options.flyFrom.endOpacity,
				duration: this.options.flyFrom.opacityDuration,
				delay: this.options.flyFrom.opacityDelay||0,
				func: this.options.flyFrom.opacityFunc,
				value: this.modal.opacity
			});
		}
		if (this.options.flyFrom.direction=="left"||this.options.flyFrom.direction=="right") {
			animateProperties.push({
				from: (this.options.flyFrom.direction=="right"?this.modal.containerWidth():-this.modal.width()),
				to: Math.floor(this.modal.containerWidth()/2-this.modal.restrictedWidth()/2),
				duration: this.options.flyFrom.duration,
				delay: this.options.flyFrom.delay||0,
				func: this.options.flyFrom.func,
				value: this.modal.left
			});
		}
		this.startRestrictAligner();
		this.startWindowWidthRestricter();
		this.animate(animateProperties,function() {
			self.modal.position("static");
			callback && callback();
		});
	}

	Modal.prototype.hide = function(callback) {
		var self = this;
		var animateProperties = [];
		if (this.options.flyTo.startOpacity||this.options.flyTo.endOpacity) {
			animateProperties.push({
				from: this.options.flyTo.startOpacity,
				to: this.options.flyTo.endOpacity,
				duration: this.options.flyTo.opacityDuration,
				delay: this.options.flyTo.opacityDelay||0,
				func: this.options.flyTo.opacityFunc,
				value: this.modal.opacity
			});
		}
		if (this.options.flyTo.direction=="left"||this.options.flyTo.direction=="right") {
			var w = this.modalsContainer.clientWidth||window.innerWidth;
			this.modal.position("absolute");
			animateProperties.push({
				from: Math.floor(this.modal.containerWidth()/2-this.modal.restrictedWidth()/2),
				to: (this.options.flyTo.direction=="right"?this.modal.containerWidth():-this.modal.width()),
				duration: this.options.flyTo.duration,
				delay: this.options.flyTo.delay||0,
				func: this.options.flyTo.func,
				value: this.modal.left
			});
		}
		this.animate(animateProperties,function() {
			self.stopRestrictAligner();
			self.stopWindowWidthRestricter();
			callback && callback();
		});
	}

	Modal.prototype.startRestrictAligner = function() {
		var self = this;
		if (!this.options.animateHeight) return;
		this._restrictAlignerRunning = true;
		var run = function() {
			if (!self._restrictAlignerRunning) return;
			self.restrictedHeight((self.modalContent||{}).offsetHeight||0);
			_.delay(run,300);
		}
		run();

	}

	Modal.prototype.stopRestrictAligner = function() {
		this._restrictAlignerRunning = false;
	}

	Modal.prototype.requestAnimFrame = function(callback) {
		return window.requestAnimationFrame(callback) || window.webkitRequestAnimationFrame(callback) || window.mozRequestAnimationFrame(callback) || window.setTimeout(callback,1000/60);
	}

	Modal.prototype.animate = function(properties,callback) {
		var self = this;
		var s = (new Date).getTime();
		var ease = function(v1,v2,t) {
			if (t<0.5) return v1+(v2-v1)*2*t*t;
			t-=0.5;
			return v1+(v2-v1)*(0.5-2*t*t+2*t);
		}
		var linear = function(v1,v2,t) {
			return v1+(v2-v1)*t;
		}
		var run = function() {
			var minP = null;
			_.forEach(properties,function(prop,i) {
				var x = (new Date).getTime();
				var delay = prop.delay||0;
				var duration = prop.duration||0;
				var p = 0;
				if (x<=s+delay) p = 0;
				else if (x>=s+duration+delay) p = 1;
				else if (duration==0) p = 1;
				else p = (x-s-delay)/duration;
				var v = (prop.func=="ease"?ease(prop.from,prop.to,p):linear(prop.from,prop.to,p));
				prop.value(v);
				if (minP==null||minP>p) minP = p;
			});
			return (minP==1?callback&&callback():self.requestAnimFrame(run));
		}
		run();
	}

	return Modal;
});