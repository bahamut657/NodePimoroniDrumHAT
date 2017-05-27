/*

Cap-touch Driver Library for Microchip CAP1xxx ICs
Supports communication over i2c only.

Currently supported ICs:
CAP1208 - 8 Inputs
CAP1188 - 8 Inputs, 8 LEDs
CAP1166 - 6 Inputs, 6 LEDs

*/
try{
	global.I2C = require('i2c-bus');
}catch(e){
	console.log("Libreria i2c-bus non installata");
}
try{
	sleep = require("sleep");
	RPIO = require("rpio");
}catch(e){
	console.log(e);
	console.log("Libreria RPIO non installata");
}
const __version__ = "0.1.0";
//DEVICE MAP
 DEFAULT_ADDR = 0x28;
//Supported Devices
 PID_CAP1208 = 0b01101011;
 PID_CAP1188 = 0b01010000;
 PID_CAP1166 = 0b01010001;
//REGISTER MAP

 R_MAIN_CONTROL = 0x00;
 R_GENERAL_STATUS = 0x02;
 R_INPUT_STATUS = 0x03;
 R_LED_STATUS = 0x04;
 R_NOISE_FLAG_STATUS = 0x0A;

//Read-only delta counts for all inputs
 R_INPUT_1_DELTA   = 0x10;
 R_INPUT_2_DELTA   = 0x11;
 R_INPUT_3_DELTA   = 0x12;
 R_INPUT_4_DELTA   = 0x13;
 R_INPUT_5_DELTA   = 0x14;
 R_INPUT_6_DELTA   = 0x15;
 R_INPUT_7_DELTA   = 0x16;
 R_INPUT_8_DELTA   = 0x17;

 R_SENSITIVITY     = 0x1F;

// B7     = N/A
// B6..B4 = Sensitivity
// B3..B0 = Base Shift
 SENSITIVITY = {128: 0b000, 64:0b001, 32:0b010, 16:0b011, 8:0b100, 4:0b100, 2:0b110, 1:0b111};

 R_GENERAL_CONFIG  = 0x20;
// B7 = Timeout
// B6 = Wake Config ( 1 = Wake pin asserted )
// B5 = Disable Digital Noise ( 1 = Noise threshold disabled )
// B4 = Disable Analog Noise ( 1 = Low frequency analog noise blocking disabled )
// B3 = Max Duration Recalibration ( 1 =  Enable recalibration if touch is held longer than max duration )
// B2..B0 = N/A

 R_INPUT_ENABLE = 0x21;
 R_INPUT_CONFIG = 0x22;
 R_INPUT_CONFIG2 = 0x23 //DEFAULT 0x0000111
/*
 Values for bits 3 to 0 of R_INPUT_CONFIG2
 Determines minimum amount of time before
 a "press and hold" event is detected.

 Also - Values for bits 3 to 0 of R_INPUT_CONFIG
 Determines rate at which interrupt will repeat

 Resolution of 35ms, max = 35 + (35 * 0b1111) = 560ms
*/
 R_SAMPLING_CONFIG = 0x24; // Default 0x00111001
 R_CALIBRATION     = 0x26; // Default 0b00000000
 R_INTERRUPT_EN    = 0x27; // Default 0b11111111
 R_REPEAT_EN       = 0x28; // Default 0b11111111
 R_MTOUCH_CONFIG   = 0x2A; // Default 0b11111111
 R_MTOUCH_PAT_CONF = 0x2B;
 R_MTOUCH_PATTERN  = 0x2D;
 R_COUNT_O_LIMIT   = 0x2E;
 R_RECALIBRATION   = 0x2F;

// R/W Touch detection thresholds for inputs
 R_INPUT_1_THRESH  = 0x30;
 R_INPUT_2_THRESH  = 0x31;
 R_INPUT_3_THRESH  = 0x32;
 R_INPUT_4_THRESH  = 0x33;
 R_INPUT_5_THRESH  = 0x34;
 R_INPUT_6_THRESH  = 0x35;
 R_INPUT_7_THRESH  = 0x36;
 R_INPUT_8_THRESH  = 0x37;

// R/W Noise threshold for all inputs
 R_NOISE_THRESH    = 0x38;

// R/W Standby and Config Registers
 R_STANDBY_CHANNEL = 0x40;
 R_STANDBY_CONFIG  = 0x41;
 R_STANDBY_SENS    = 0x42;
 R_STANDBY_THRESH  = 0x43;

 R_CONFIGURATION2  = 0x44;
/*
 B7 = Linked LED Transition Controls ( 1 = LED trigger is !touch )
 B6 = Alert Polarity ( 1 = Active Low Open Drain, 0 = Active High Push Pull )
 B5 = Reduce Power ( 1 = Do not power down between poll )
 B4 = Link Polarity/Mirror bits ( 0 = Linked, 1 = Unlinked )
 B3 = Show RF Noise ( 1 = Noise status registers only show RF, 0 = Both RF and EMI shown )
 B2 = Disable RF Noise ( 1 = Disable RF noise filter )
 B1..B0 = N/A
*/

// Read-only reference counts for sensor inputs
 R_INPUT_1_BCOUNT  = 0x50;
 R_INPUT_2_BCOUNT  = 0x51;
 R_INPUT_3_BCOUNT  = 0x52;
 R_INPUT_4_BCOUNT  = 0x53;
 R_INPUT_5_BCOUNT  = 0x54;
 R_INPUT_6_BCOUNT  = 0x55;
 R_INPUT_7_BCOUNT  = 0x56;
 R_INPUT_8_BCOUNT  = 0x57;

// LED Controls - For CAP1188 and similar
 R_LED_OUTPUT_TYPE = 0x71;
 R_LED_LINKING     = 0x72;
 R_LED_POLARITY    = 0x73;
 R_LED_OUTPUT_CON  = 0x74;
 R_LED_LTRANS_CON  = 0x77;
 R_LED_MIRROR_CON  = 0x79;

// LED Behaviour
 R_LED_BEHAVIOUR_1 = 0x81; // For LEDs 1-4
 R_LED_BEHAVIOUR_2 = 0x82; // For LEDs 5-8
 R_LED_PULSE_1_PER = 0x84;
 R_LED_PULSE_2_PER = 0x85;
 R_LED_BREATHE_PER = 0x86;
 R_LED_CONFIG      = 0x88;
 R_LED_PULSE_1_DUT = 0x90;
 R_LED_PULSE_2_DUT = 0x91;
 R_LED_BREATHE_DUT = 0x92;
 R_LED_DIRECT_DUT  = 0x93;
 R_LED_DIRECT_RAMP = 0x94;
 R_LED_OFF_DELAY   = 0x95;

// R/W Power buttonc ontrol
 R_POWER_BUTTON    = 0x60;
 R_POW_BUTTON_CONF = 0x61;

// Read-only upper 8-bit calibration values for sensors
 R_INPUT_1_CALIB   = 0xB1;
 R_INPUT_2_CALIB   = 0xB2;
 R_INPUT_3_CALIB   = 0xB3;
 R_INPUT_4_CALIB   = 0xB4;
 R_INPUT_5_CALIB   = 0xB5;
 R_INPUT_6_CALIB   = 0xB6;
 R_INPUT_7_CALIB   = 0xB7;
 R_INPUT_8_CALIB   = 0xB8;

// Read-only 2 LSBs for each sensor input
 R_INPUT_CAL_LSB1  = 0xB9;
 R_INPUT_CAL_LSB2  = 0xBA;

// Product ID Registers
 R_PRODUCT_ID      = 0xFD;
 R_MANUFACTURER_ID = 0xFE;
 R_REVISION        = 0xFF;

// LED Behaviour settings
 LED_BEHAVIOUR_DIRECT  = 0b00;
 LED_BEHAVIOUR_PULSE1  = 0b01;
 LED_BEHAVIOUR_PULSE2  = 0b10;
 LED_BEHAVIOUR_BREATHE = 0b11;

 LED_OPEN_DRAIN = 0; // Default, LED is open-drain output with ext pullup
 LED_PUSH_PULL  = 1; // LED is driven HIGH/LOW with logic 1/0

 LED_RAMP_RATE_2000MS = 7;
 LED_RAMP_RATE_1500MS = 6;
 LED_RAMP_RATE_1250MS = 5;
 LED_RAMP_RATE_1000MS = 4;
 LED_RAMP_RATE_750MS  = 3;
 LED_RAMP_RATE_500MS  = 2;
 LED_RAMP_RATE_250MS  = 1;
 LED_RAMP_RATE_0MS    = 0;

/* Emulated Thread*/
function AsyncWorker(fxloop){
	this.threadtimer = 100;
	this.timer = false;
	this.init();
};
AsyncWorker.prototype = {
	init:function(){

	},
	start:function(){
		clearTimeout(this.timer);
		var res = fxloop();
		if (res === false)
			this.stop();
		else
			this.timer = setTimeout( () => {
				this.start();
			},this.threadtimer);
	},
	stop:function(){
		clearTimeout(this.timer);
	}
};

function CapTouchEvent(channel,event,delta){
	this.init(channel,event,delta);
}
CapTouchEvent.prototype = {
	init:function(channel,event,delta){
		this.channel = channel;
		this.event = event;
		this.delta = delta;
	}
};

function Cap1xxx(i2c_addr, i2c_bus, alert_pin, reset_pin, on_touch, skip_init){
	if (i2c_addr === undefined)
		i2c_addr = DEFAULT_ADDR;
	if (i2c_bus === undefined)
		i2c_bus = 1;
	if (alert_pin === undefined)
		alert_pin = -1;
	if (reset_pin === undefined)
		reset_pin = -1;
	if (on_touch === undefined)
		on_touch = null;
	if (skip_init === undefined)
		skip_init = false;
	this.supported = [PID_CAP1208, PID_CAP1188, PID_CAP1166];
	this.number_of_inputs = 8;
	this.number_of_leds = 8;

	this.init(i2c_addr, i2c_bus, alert_pin, reset_pin, on_touch, skip_init);
}
Cap1xxx.prototype = {
	_getListOf: function(value,num){
		var l = [];
		for (var x = 0; x < num;x++)
			l.push(value);
		return l;
	},
	_get_product_id:function(){
        return this._read_byte(R_PRODUCT_ID);
	},
	
	init:function(i2c_addr, i2c_bus, alert_pin, reset_pin, on_touch, skip_init){
		if (on_touch === null)
			on_touch = this._getListOf(null,this.number_of_inputs);
		
		this.async_poll = null;
		this.i2c_addr = i2c_addr;
		this.i2c = global.I2C.openSync(i2c_bus);
		this.alert_pin = alert_pin;
		this.reset_pin = reset_pin;

		RPIO.init({
			gpiomem:false,
			mapping:"gpio"
		});
		if (this.alert_pin !== -1){
			RPIO.mode(this.alert_pin,RPIO.INPUT);
			RPIO.pud(this.alert_pin,RPIO.PULL_UP);
		}
		if (this.reset_pin !== -1){
			RPIO.open(this.reset_pin,RPIO.OUT,RPIO.LOW);
			RPIO.write(this.reset_pin,RPIO.HIGH);
			sleep.msleep(10);
			RPIO.write(this.reset_pin, RPIO.LOW);	
		}

		this.handlers = {
			'press'  : this._getListOf(null,this.number_of_inputs),
			'release'  : this._getListOf(null,this.number_of_inputs),
			'held'  : this._getListOf(null,this.number_of_inputs)
		};
		
		this.touch_handlers = on_touch;
		this.last_input_status = this._getListOf(false, this.number_of_inputs);
		this.input_status = this._getListOf('none', this.number_of_inputs);
		this.input_delta = this._getListOf(0,this.number_of_inputs);
		this.input_pressed = this._getListOf(false,this.number_of_inputs);
		this.repeat_enabled    = 0b00000000;
        this.release_enabled   = 0b11111111;
        
        this.product_id = this._get_product_id();

        if (this.supported.indexOf(this.product_id) === -1){
        	throw new Exception("ProductID "+this.product_id+" non supportato!");

        }
        if (skip_init)
        	return;
        // Enable all inputs with interrupt by default
        this.enable_inputs(0b11111111);
        this.enable_interrupts(0b11111111);

        // Disable repeat for all channels, but give
        // it sane defaults anyway
        this.enable_repeat(0b00000000)
        this.enable_multitouch(True)

        this.set_hold_delay(210)
        this.set_repeat_rate(210)

        // Tested sane defaults for various configurations
        this._write_byte(R_SAMPLING_CONFIG, 0b00001000) // 1sample per measure, 1.28ms time, 35ms cycle
        this._write_byte(R_SENSITIVITY,     0b01100000) // 2x sensitivity
        this._write_byte(R_GENERAL_CONFIG,  0b00111000)
        this._write_byte(R_CONFIGURATION2,  0b01100000)
        this.set_touch_delta(10)

        //atexit.register(self.stop_watching)

	},
	get_input_status:function(){
		/*
		 Get the status of all inputs.
         Returns an array of 8 boolean values indicating
         whether an input has been triggered since the
         interrupt flag was last cleared.
        */
        var touched = this._read_byte(R_INPUT_STATUS),
        	threshold = this._read_block(R_INPUT_1_THRESH, this.number_of_inputs),
        	delta = this._read_block(R_INPUT_1_DELTA, this.number_of_inputs);
        
        for (var x = 0; x < this.number_of_inputs; x++){
        	if ((1 << x) & touched){
        		var status = 'none';
        		var _delta = this._get_twos_comp(delta[x]);
        		//threshold = self._read_byte(R_INPUT_1_THRESH + x)
                // We only ever want to detect PRESS events
                // If repeat is disabled, and release detect is enabled
                if (_delta >= threshold[x]){
                	this.input_delta[x] = _delta;
                	//Touch down event
                	if (this.input_status[x] === "press" ||
                	 	this.input_status[x] === "held"){
                		if (this.repeat_enabled & (1 << x))
                			status = 'held';
                	}
                	if (this.input_status[x] === 'none' ||
                		this.input_status[x] === 'release'){
                		if (this.input_pressed[x])
                			status = 'none';
                		else 
                			status = 'press';
                	}
                }else{
                	//Touch release event
                	if (this.release_enabled & (1 << x) && 
                		(this.input_status !== "release"))
                			status = 'release';
                	else status = 'none';
                }
                this.input_status[x] = status;
                if (['press','held','none'].indexOf(status) !== -1)
                	this.input_pressed[x] = true;
                else this.input_pressed[x] = false;
                
        	}else{
        		this.input_status[x] = 'none';
        		this.input_pressed[x] = false;
        	}
        }
        return this.input_status;
	},
	_get_twos_comp:function(val){
        if (( val & (1<< (8 - 1))) != 0)
            val = val - (1 << 8);
        return val;
    },
    clear_interrupt:function(){
        /*
        	Clear the interrupt flag, bit 0, of the
        	main control register
        */
        var main = this._read_byte(R_MAIN_CONTROL)
        main &= ~0b00000001
        this._write_byte(R_MAIN_CONTROL, main);
    },
    _interrupt_status:function(){
        if (this.alert_pin == -1)
            return this._read_byte(R_MAIN_CONTROL) & 1;
        else
            return !RPIO.read(this.alert_pin);
	},
	wait_for_interrupt:function(timeout){
        /*
        Wait for, interrupt, bit 0 of the main
        control register to be set, indicating an
        input has been triggered.
        */
       /* if (timeout === undefined)
        	timeout = 100;
        var start = this._millis();*/
        if (!this.pollStarted){
	        this.pollStarted = true;
	        var pollInterval = setInterval( () => {
	        	var status = this._interrupt_status();
	        	if (status){
	        		this.interrupt_triggered = true;
	        		clearInterval(pollInterval);
	        		this._handle_alert()
	        	}

	        },5);
	        var pollTimeout = setTimeout( () => {
	        	clearInterval(pollInterval);
	        	if (this.interrupt_triggered === undefined){
	        		this.interrupt_triggered = false;
	        		this.pollStarted = false;
	        	}
	        },100);
	    }
        
       /* while (true){
            var status = this._interrupt_status() // self._read_byte(R_MAIN_CONTROL)
            if (status)
                return true;
            if (this._millis() > start + timeout)
                return false;
            sleep.msleep(5);
        }*/
    },
    on:function(channel, event, handler){
    	this.handlers[event][channel] = handler;
        this.start_watching();
        return true;
    },
    start_watching:function(){
    	if (this.alert_pin !== -1){
            try{

                RPIO.poll(this.alert_pin, this._handle_alert,GPIO.POLL_LOW/* , bouncetime=1*/)
                this.clear_interrupt();
            }catch(e){
                
            }
            return true;
        }

        if (this.async_poll == null){
            this.async_poll = AsyncWorker(this._poll)
            this.async_poll.start()
            return true;
        }
        return false;
    },
    stop_watching: function(){
        if (this.alert_pin !== -1)
            RPIO.poll(this.alert_pin,null,GPIO.POLL_LOW);

        if (this.async_poll !== null){
            this.async_poll.stop();
            this.async_poll = null;
            return true;
        }
        return false;
    },
    set_touch_delta:function(delta){
        this._delta = delta;
    },
    auto_recalibrate:function(value){
		this._change_bit(R_GENERAL_CONFIG, 3, value)
    },
    filter_analog_noise:function(value){
        this._change_bit(R_GENERAL_CONFIG, 4, !value);
    },
    filter_digital_noise:function(value){
        this._change_bit(R_GENERAL_CONFIG, 5, !value);
    },
    set_hold_delay:function(ms){
        /*
        Set time before a press and hold is detected,
        Clamps to multiples of 35 from 35 to 560
        */
        var repeat_rate = this._calc_touch_rate(ms);
        var input_config = this._read_byte(R_INPUT_CONFIG2);
        input_config = (input_config & ~0b1111) | repeat_rate;
        this._write_byte(R_INPUT_CONFIG2, input_config)
    },
    set_repeat_rate:function(ms){
        /*
        Set repeat rate in milliseconds, 
        Clamps to multiples of 35 from 35 to 560
        */
        var repeat_rate = this._calc_touch_rate(ms);
        var input_config = this._read_byte(R_INPUT_CONFIG);
        input_config = (input_config & ~0b1111) | repeat_rate;
        this._write_byte(R_INPUT_CONFIG, input_config);
    },
    _calc_touch_rate:function(ms){
        ms = Math.min(Math.max(ms,0),560)
        var scale = parseInt(((Math.round(ms / 35.0) * 35) - 35) ,10) / 35;
        return parseInt(scale,10);
    },
    _handle_alert:function(pin){
    	if (pin === undefined)
    		pin = -1;
        var inputs = this.get_input_status();
        for (var x = 0; x < this.number_of_inputs;x++)
            this._trigger_handler(x, inputs[x]);
        this.clear_interrupt();
    },
    _poll:function(){
        /*Single polling pass, should be called in
        a loop, preferably threaded.*/
        /*if (this.wait_for_interrupt()){
            this._handle_alert();
        }*/
        
    },
    _trigger_handler:function(channel, event){
        if (event == 'none')
            return;
        if (typeof this.handlers[event][channel] === "function"){
            try{
                this.handlers[event][channel](new CapTouchEvent(channel, event, this.input_delta[channel]));
            }catch(e){
                this.handlers[event][channel](channel, event);
            }
        }
    },
    enable_multitouch:function(en){
    	if (en === undefined)
    		en = true;
        /*
        Toggles multi-touch by toggling the multi-touch
        block bit in the config register
        */
        var ret_mt = this._read_byte(R_MTOUCH_CONFIG);
        if (en)
            this._write_byte(R_MTOUCH_CONFIG, ret_mt & ~0x80);
        else
            this._write_byte(R_MTOUCH_CONFIG, ret_mt | 0x80 );
    },
    enable_repeat:function(inputs){
        this.repeat_enabled = inputs;
        this._write_byte(R_REPEAT_EN, inputs);
    },
    enable_interrupts:function(inputs){
        this._write_byte(R_INTERRUPT_EN, inputs);
    },
    enable_inputs:function(inputs){
        this._write_byte(R_INPUT_ENABLE, inputs);
    },
    _write_byte:function(register,value){
    	this.i2c.bus.writeByteSync(this.i2c_addr, register,value);
    },
    _read_byte:function(register){
        return this.i2c.readByteSync(this.i2c_addr, register);
    },
    _read_block:function(register, length){
    	var buf = Buffer.alloc(length);
        this.i2c.readI2cBlockSync(this.i2c_addr, register, length,buf)
        return buf;
    },
    _millis:function(){
    	var n = new Date();
    	return parseInt(n.getTime().toString()+n.getMilliseconds().toString(),10);

    },
    _set_bit:function(register, bit){
       this._write_byte( register, this._read_byte(register) | (1 << bit) );
    },

	_clear_bit:function(register, bit){
        this._write_byte( register, this._read_byte(register) & ~(1 << bit ) );
	},

    _change_bit:function(register, bit, state){
        if (state)
            this._set_bit(register, bit);
        else
            this._clear_bit(register, bit);
    },
    _change_bits:function(register, offset, size, bits){
        var original_value = this._read_byte(register);
        for (var x = 0; x < size; x++)
            original_value &= ~(1 << (offset+x));
        original_value |= (bits << offset)
        this._write_byte(register, original_value);
    },

    destroy:function(){
        this.stop_watching();
    }

};
function Cap1xxxLeds(){
	Cap1xxx.apply(this,arguments);


	this.set_led_linking = function(led_index, state){
        if (led_index >= this.number_of_leds)
            return false
        this._change_bit(R_LED_LINKING, led_index, state);
    };
    this.set_led_output_type =function(self, led_index, state){
        if (led_index >= this.number_of_leds)
            return false;
        this._change_bit(R_LED_OUTPUT_TYPE, led_index, state);
    };
    this.set_led_state = function(led_index, state){
        if (led_index >= this.number_of_leds)
            return false;
        this._change_bit(R_LED_OUTPUT_CON, led_index, state);
    };
    this.set_led_polarity = function(led_index, state){
        if (led_index >= this.number_of_leds)
            return false;
        this._change_bit(R_LED_POLARITY, led_index, state);
    };
    this.set_led_behaviour = function(led_index, value){
        //Set the behaviour of a LED
        var offset = (led_index * 2) % 8
        var register = led_index / 4
        value &= 0b00000011
        this._change_bits(R_LED_BEHAVIOUR_1 + register, offset, 2, value);
    };
    this.set_led_pulse1_period = function(period_in_seconds){
        //Set the overall period of a pulse from 32ms to 4.064 seconds
        period_in_seconds = Math.min(period_in_seconds, 4.064);
        var value = parseInt((period_in_seconds * 1000.0 / 32.0),10) & 0b01111111;
        this._change_bits(R_LED_PULSE_1_PER, 0, 7, value);
    };
	this.set_led_pulse2_period = function(period_in_seconds){
        //Set the overall period of a pulse from 32ms to 4.064 seconds
        period_in_seconds = Math.min(period_in_seconds, 4.064);
        var value = parseInt((period_in_seconds * 1000.0 / 32.0),10) & 0b01111111;
        this._change_bits(R_PULSE_LED_2_PER, 0, 7, value);
    };
    this.set_led_breathe_period = function(period_in_seconds){
        period_in_seconds = Math.min(period_in_seconds, 4.064);
        var value = parseInt((period_in_seconds * 1000.0 / 32.0),10) & 0b01111111;
        this._change_bits(R_LED_BREATHE_PER, 0, 7, value);
    };
    this.set_led_pulse1_count = function(count){
        count -= 1;
        count &= 0b111;
        this._change_bits(R_LED_CONFIG, 0, 3, count);
    };
    this.set_led_pulse2_count = function(count){
        count -= 1;
        count &= 0b111;
        this._change_bits(R_LED_CONFIG, 3, 3, count);
    };
    this.set_led_ramp_alert=function(value){
        this._change_bit(R_LED_CONFIG, 6, value);
    };
    this.set_led_direct_ramp_rate=function(rise_rate, fall_rate){
    	if (rise_rate === undefined)
    		rise_rate=0;
    	if (fall === undefined)
    		fall_rate=0;
        /*
        Set the rise/fall rate in ms, max 2000.

        Rounds input to the nearest valid value.

        Valid values are 0, 250, 500, 750, 1000, 1250, 1500, 2000

        */
        rise_rate = parseInt(Math.round(rise_rate / 250.0),10);
        fall_rate = parseInt(Math.round(fall_rate / 250.0),10);

        rise_rate = Math.min(7, rise_rate);
        fall_rate = Math.min(7, fall_rate);

        var rate = (rise_rate << 4) | fall_rate;
        this._write_byte(R_LED_DIRECT_RAMP, rate);
    };
    this.set_led_direct_duty=function(duty_min, duty_max){
        var value = (duty_max << 4) | duty_min;
        this._write_byte(R_LED_DIRECT_DUT, value);
    };
    this.set_led_pulse1_duty=function(duty_min, duty_max){
        var value = (duty_max << 4) | duty_min;
        this._write_byte(R_LED_PULSE_1_DUT, value);
    };
    this.set_led_pulse2_duty=function(duty_min, duty_max){
        var value = (duty_max << 4) | duty_min;
        this._write_byte(R_LED_PULSE_2_DUT, value);
    };

    this.set_led_breathe_duty=function(duty_min, duty_max){
        value = (duty_max << 4) | duty_min;
        this._write_byte(R_LED_BREATHE_DUT, value);
    };

    this.set_led_direct_min_duty=function(value){
        this._change_bits(R_LED_DIRECT_DUT, 0, 4, value);
    };
    this.set_led_direct_max_duty=function(value){
        this._change_bits(R_LED_DIRECT_DUT, 4, 4, value);
    };

    this.set_led_breathe_min_duty=function(value){
        this._change_bits(R_LED_BREATHE_DUT, 0, 4, value);
    };

    this.set_led_breathe_max_duty=function( value){
        this._change_bits(R_LED_BREATHE_DUT, 4, 4, value);
    };

    this.set_led_pulse1_min_duty=function(value){
        this._change_bits(R_LED_PULSE_1_DUT, 0, 4, value);
    };

    this.set_led_pulse1_max_duty=function(value){
        this._change_bits(R_LED_PULSE_1_DUT, 4, 4, value);
    };

    this.set_led_pulse2_min_duty=function(value){
        this._change_bits(R_LED_PULSE_2_DUT, 0, 4, value);
    };

    this.set_led_pulse2_max_duty=function(value){
        this._change_bits(R_LED_PULSE_2_DUT, 4, 4, value);
    };
};     
Cap1xxxLeds.prototype = Cap1xxx.prototype;
Cap1xxxLeds.prototype.constructor = Cap1xxxLeds;




function Cap1208(){
	Cap1xxx.apply(this,arguments);
	this.supported = [PID_CAP1208];
}
Cap1208.prototype = Cap1xxx.prototype;
Cap1208.prototype.constructor = Cap1208;


function Cap1188(){
	Cap1xxxLeds.apply(this,arguments);	

	this.supported = [PID_CAP1188]
	this.number_of_leds = 8;
}
Cap1188.prototype = Cap1xxxLeds.prototype;
Cap1188.prototype.constructor = Cap1188;


function Cap1166(){
	Cap1xxxLeds.apply(this,arguments);	

	this.supported = [PID_CAP1166]
	this.number_of_leds = 6;
	this.number_of_inputs = 6;
}
Cap1166.prototype = Cap1xxxLeds.prototype;
Cap1166.prototype.constructor = Cap1166;


module.exports = {
	Cap1188:function(i2c_addr, i2c_bus, alert_pin, reset_pin, on_touch, skip_init){
	 return new Cap1188(i2c_addr, i2c_bus, alert_pin, reset_pin, on_touch, skip_init);
	},
	Cap1166:function(i2c_addr, i2c_bus, alert_pin, reset_pin, on_touch, skip_init){
		return new Cap1166(i2c_addr, i2c_bus, alert_pin, reset_pin, on_touch, skip_init);
	},
	Cap1208:function(i2c_addr, i2c_bus, alert_pin, reset_pin, on_touch, skip_init){
		return new Cap1208(i2c_addr, i2c_bus, alert_pin, reset_pin, on_touch, skip_init);
	},
	DetectCap:function(i2c_addr,i2c_bus,product_id){
		var bus = global.I2C.openSync(i2c_bus);
		try{
			if (bus.readByteSync(i2c_addr,R_PRODUCT_ID) == product_id)
				return true;
			else return false;
		}catch(e){
			console.log("IO ERROR")
			return false;
		}
	}
}