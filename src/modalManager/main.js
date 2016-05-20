define(["jquery","underscore","knockout","config","./modal"],function($,_,ko,config,Modal) {

	var ModalManager = function(o) {
		var self = this;
		this.eventEmitter = o.core.eventEmitter;
		this.eventEmitter.on("switchModal",function(name,options) {
			self.switchModal(name,options);
		});
		this.eventEmitter.on("closeModal",function(name,options) {
			self.closeModal(name,options);
		});
		this.eventEmitter.on("findModal",function(name,callback) {
			var m = _.find(self.modals(),{name:name});
			if (m) return callback && callback(m);
		});

		this.container = ko.observable();
		this.eventEmitter.on("modals.scrollTo",function(value,duration) {
			var active = (self.modals().length>0);
			if (active && self.container() && self.container().nodeType==1) {
				$(self.container()).animate({
					scrollTop: value
				},duration||0);
			}
			else {
				$("html,body").animate({
					scrollTop: value
				},duration||0);
			}
		});
		this.active = ko.observable(false);
		this.modals = ko.observableArray();
		this.backdropStyle = ko.observable({opacity:0});
	}

	ModalManager.prototype.switchModal = function(name,options) {
		var self = this;
		this.hideModals();
		var m = _.find(this.modals(),{name:name});
		if (m) {
			m.hide(function() {
				var i = _.findIndex(self.modals(),{name:name});
				(i>0||i==0) && self.modals.splice(i,1);
				self.updateActive();
			});
		}
		else {
			m = new Modal(name,options);
			self.modals.push(m);
			self.updateActive();
		}
	}

	ModalManager.prototype.closeModal = function(name,options) {
		var self = this;
		var m = _.find(this.modals(),{name:name});
		if (m) return self.switchModal(name,options);
	}

	ModalManager.prototype.hideModals = function() {
		var self = this;
		if (this._preventHideModals || this.modals().length==0) return true;
		var promises = [];
		var modals2hide = {};
		this.modals().forEach(function(m) {
			var d = $.Deferred();
			m.onHide && m.onHide();
			m.hide(function() {
				d.resolve();
			});
			modals2hide[m.name] = true;
			promises.push(d);
		});
		$.when.apply($,promises).then(function() {
			// We don't use just self.modals([]) because the time some modals hide there might appear other modals
			// self.modals([]);
			for (var i=0;i<self.modals().length;i++) {
				if (modals2hide[self.modals()[i].name]) {
					self.modals.splice(i,1);
					i--;
				}
			}
			self.updateActive();
		});
		return true;
	}

	ModalManager.prototype.preventHideModals = function() {
		var self = this;
		// Dirty hack here (clickBubble does not work)
		this._preventHideModals = true;
		_.delay(function(){self._preventHideModals=false;},200);
		return true;
	}

	ModalManager.prototype.updateActive = function(force) {
		var self = this;
		var active = (self.modals().length>0);
		if (!force && (this.active()==active)) return;
		if (active) {
			var bodyScrollWidth = (window.innerWidth-document.documentElement.clientWidth)||0;
			this._origOverflow = $("body").css("overflow-y");
			$("body").css("overflow-y","hidden").css("margin-right",bodyScrollWidth+"px");
			$(".wd-affected-by-fixed-body-scroll-offset").css("margin-right",bodyScrollWidth+"px");
			this.backdropStyle({opacity:0});
			this.active(true);
			_.defer(this.backdropStyle,{opacity:1});
		}
		else {
			this.backdropStyle({opacity:0});
			$("body").css("overflow-y",this._origOverflow||"auto").css("margin-right",0);
			$(".wd-affected-by-fixed-body-scroll-offset").css("margin-right",0);
			_.delay(function() {
				var active = (self.modals().length>0);
				if (active) self.updateActive(true);
				else self.active(false);
			},500);
		}
	}

	ModalManager.prototype.afterRenderModal = function() {
		var self = this;
		return function(nodes,m) {
			m.setModalsContainer($(nodes).closest(".wd-modals").get(0));
			m.setModalContent($(nodes).find(".wd-modal__content").get(0));
		}
	}

	return ModalManager;
});