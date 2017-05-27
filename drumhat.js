const cap1xxx = require("./cap1xxx.js");
const version = "0.1.0";
const PADS = [1,2,3,4,5,6,7,8];
const LEDMAP = [
	5,	4,	3,	2,
	1,	0,	6,	7
];
const NUMMAP = [
	4,	3,	2,	1,
	7,	6,	5,	8
];

global._on_press = _getListOf(null,8);
global._on_release = _getListOf(null,8);

function _getListOf(value,num){
		var l = [];
		for (var x = 0; x < num;x++)
			l.push(value);
		return l;
}




function DrumHat(){
	this.dh=false;
	this.init();	
}
DrumHat.prototype = {
	init:function(){
		this.setConfig();
		this.setDH();
		this.bindDHEvent();
	},
	setDH:function(){
		var dh = new cap1xxx.Cap1188(0x2c,undefined,25);
		this.dh = dh;
	},
	bindDHEvent:function(){
		for (var x =0; x < 8; x++){
			this.dh.on(x,'press',this._handle_press);
			this.dh.on(x,'release',this._handle_release);
		}
		//Unlink the LEDs since Drum HAT's LEDs don't match up with the channels
		this.dh._write_byte(cap1xxx.R_LED_LINKING, 0b00000000)
	},
	setConfig:function(){
		this.config = {
			auto_leds:true
		}
	},
	on_hit:function(pad,handler){
		if (handler ===undefined)
			handler = null;
		if (pad && pad.push){
			pad.forEach( (p) => {
				this.on_hit(p);
			})
			return;
		}
		try{
			var channel = NUMMAP.indexOf(pad);
		}catch(e){
			console.log(e);
			console.log("DrumPad non valido",pad)

		}
		if (handler === null){
			return function(handler){
				global._on_press[channel] = handler;
			};
		}
		global._on_press[channel] = handler;
	},
	on_release:function(pad,handler){
		if (handler ===undefined)
			handler = null;
		if (pad && pad.push){
			pad.forEach( (p) => {
				this.on_release(p);
			})
			return;
		}
		try{
	        var channel = NUMMAP.indexOf(pad);
		}catch(e){
	    	console.log(e);
	        console.log("Invalid drum pad ",pad);
	    }

	    if (handler === null){
	        return function(handler){
				global._on_release[channel] = handler;
			};
		}
	    global._on_release[channel] = handler;
	},
	_handle_press:function(event){
		var channel = event.channel;
		event.pad = NUMMAP[channel];

		if (this.config.auto_leds)
			this.dh.set_led_state(LEDMAP[channel],true);
		if (typeof global._on_press[channel] === "function"){
			try{
				global._on_press[channel](event);
			}catch(e){
				global._on_press[channel]();
			}
		}
	},
	_handle_release:function(event){
		var channel = event.channel;
		event.pad = NUMMAP[channel];

		if (this.config.auto_leds)
			this.dh.set_led_state(LEDMAP[channel],false);
		if (typeof global._on_release[channel] === "function"){
			try{
				global._on_release[channel](event);
			}catch(e){
				global._on_release[channel]();
			}
		}
	},
	led_on:function(pad){
		var idx = -1;
		try{
			idx=NUMMAP.indexOf(pad);
			var led = LEDMAP[idx];
			this.dh.set_led_state(led,true);
		}catch(e){
			console.log(e);
			console.log("Invalid drum pad on led_on",pad);
		}

	},
	all_off:function(){
		PADS.forEach((p) =>{
			this.led_off(p);
		});
	},
	all_on:function(){
		PADS.forEach((p) =>{
			this.led_on(p);
		});
	},
	led_off:function(pad){
		var idx = -1;
		try{
			idx=NUMMAP.indexOf(pad);
			var led = LEDMAP[idx];
			this.dh.set_led_state(led,false);
		}catch(e){
			console.log(e);
			console.log("Invalid drum pad on led_off",pad);
		}

	},
}
module.exports = function(){

	return new DrumHat(arguments);
};