var canvas = document.getElementById("c");
var ctx = canvas.getContext("2d");


const ICON_HOME = "\u{1F3E0}";
const ICON_SUPERMARKET = "\u{1F6D2}";
const ICON_CINEMA = "\u{1F4FD}";
const ICON_STADIUM = "\u{1F3DF}";
const ICON_WORK = "\u{1F3E2}";

const ICON_PEOPLE = "\u{263B}";
const ICON_DEAD = "\u{2620}";

const PRECISION  = 20;

var attacks = {};
attacks["Cough"] = {range: 10, duration: 10, effectiveness : 0.2, only_places:false};
attacks["Sneeze"] = {range: 20, duration: 10, effectiveness : 0.1, only_places:false};
attacks["Surface"] = {range: 10, duration: 300, effectiveness : 0.01, only_places:true};
attacks["Aerosol"] = {range: 25, duration: 180, effectiveness : 0.001, only_places:false};

const levels =
      // 0
      [{name : "It's just a flu!",
        attacks : ["Cough", "Surface"],
        confinment: 0.99,
        countdown: 3000,
        homes :
        [{x:600,y:350,people:1},
         {x:10,y:10,people:6},
         {x:100,y:200,people:6}],
        places :
        [{name:ICON_SUPERMARKET, x:300, y:100, stay_time:90},
         {name:ICON_CINEMA, x:400, y:350, stay_time: 200}]},
       // 1
       {name : "Lockdown announced for tomorrow!",
        attacks : ["Cough", "Sneeze", "Surface"],
        confinment: 0.99,
        countdown:5000,
        homes :
        [{x:10,y:10,people:2},{x:60,y:10,people:2},
         {x:110,y:10,people:2},{x:160,y:10,people:2},
         {x:210,y:10,people:2},{x:260,y:10,people:2},
         {x:310,y:10,people:2},{x:360,y:10,people:2},
         {x:410,y:10,people:2},{x:460,y:10,people:2},
         {x:510,y:10,people:2},{x:560,y:10,people:2},
         {x:610,y:10,people:2}
        ],
        places :
        [{name:ICON_SUPERMARKET, x:300, y:100, stay_time:60},
         {name:ICON_CINEMA,x:400, y:350, stay_time: 200},
         {name:ICON_STADIUM,x:30, y:200, stay_time: 200},
         {name:ICON_WORK,x:30, y:350, stay_time: 480}
        ]
       },
       // 2
       {name : "Lockdown !",
        attacks : ["Cough", "Sneeze"],
        confinment: 0.9999,
        countdown:5000,
        homes :
        [{x:10,y:10,people:1},{x:20,y:10,people:1},
         {x:30,y:10,people:1},{x:40,y:10,people:1},
         {x:50,y:10,people:1},{x:60,y:10,people:2},
         {x:70,y:10,people:2},
         {x:110,y:10,people:2},{x:160,y:10,people:2},
         {x:210,y:10,people:2},{x:260,y:10,people:2},
         {x:310,y:10,people:2},{x:360,y:10,people:2},
         {x:410,y:10,people:2},{x:460,y:10,people:2},
         {x:510,y:10,people:2},{x:560,y:10,people:2},
         {x:610,y:10,people:2}
        ],
        places :
        [{name:ICON_SUPERMARKET, x:300, y:300, stay_time:60}
        ]
       },
       // 3
       {name : "Go back to work !",
        attacks : ["Cough", "Sneeze", "Surface", "Aerosol"],
        confinment: 0.995,
        countdown:10000,
        homes :
        [{x:10,y:10,people:1},{x:60,y:10,people:2},{x:70,y:10,people:2},
         {x:110,y:10,people:2},{x:160,y:10,people:2},
         {x:210,y:10,people:2},{x:260,y:10,people:2},
         {x:310,y:10,people:2},{x:360,y:10,people:2},
         {x:410,y:10,people:2},{x:460,y:10,people:2},
         {x:510,y:10,people:2},{x:560,y:10,people:2},
         {x:610,y:10,people:2}
        ],
        places :
        [{name:ICON_SUPERMARKET, x:100, y:300, stay_time:60},
         {name:ICON_WORK, x:400, y:300, stay_time:480}
        ]
       }
      ];

const SICK_TIME=2000;
const DEATH_ODDS=0.1;
const TIMEOUT=10;

var people = [];
var taints = [];

function init_people(homes) {
    homes.forEach(function(h, i) {
	for (j=0; j < h.people; j++) {
	    p = {x : h.x+10,
                 y : h.y+10,
                 home_id : i,
                 sick_time : 0,
                 got_sick : false,
                 status : "at",
                 place_id : "home",
                 for : 0
                };
	    people.push(p);
	}
    });
}

function draw_homes (homes) {
    ctx.font = "36px 'Symbola'";
    ctx.fillStyle = "green";
    homes.forEach(function(h, i) {
	ctx.fillText(ICON_HOME, h.x, h.y+16);
    });
}

function draw_places (places) {
    ctx.font = "72px 'Symbola'";
    ctx.strokeStyle = "black";
    places.forEach(function(p, i) {
	ctx.strokeText(p.name, p.x-20, p.y+15);
    });
}

function update_taints() {
    taints.forEach(function(t, i) {
	if (t.duration > 0) {
    	    var range = t.attack.range;
	    ctx.fillStyle = "crimson";
	    ctx.fillRect(t.x, t.y-range, range, range);
	    t.duration--;
	} else {
	    taints.splice(i, 1)
	}
    });
}

function may_get_sick (p) {
    // consider immunity acquired (not true in real life ?)
    if (p.got_sick) { return false; }
    var tainted = function(t) {
	return ((Math.abs(t.x - p.x) < t.attack.range) &&
	        (Math.abs(t.y - p.y) < t.attack.range) &&
		((t.attack.only_places && (p.status="at")) ||
		 !(t.attack.only_places)));
    }
    var taint_info = taints.filter(tainted);
    if (taint_info.length) {
    	var rand = Math.random();
    	var effectiveness = taint_info[0].attack.effectiveness;
    	if (rand < effectiveness) {
    	    show_message("Contamination: " + rand.toFixed(2) + '/' + effectiveness);
    	    p.got_sick=true;
	    p.sick_time = SICK_TIME;
	    return true;
	} else {
	    return false;
	}
    }
}

function draw_people(p) {
    var fill_style;
    ctx.font = "22px 'Symbola'";
    if (p.status == "dead") {
	ctx.fillStyle = "black";
	ctx.fillText(ICON_DEAD, p.x,p.y);
    } else {
	ctx.fillStyle = p.sick_time > 0 ? "red": "green";
	ctx.fillText(ICON_PEOPLE, p.x,p.y);
    }
}

function move_to(people, index, to_x, to_y) {
    var x = people.x;
    var y = people.y;
    var diff_x = to_x+10 - x;
    var diff_y = to_y+10 - y;
    if ((diff_x == 0) && (diff_y == 0)) {
	people.status = "at";
	people.for = 0;
	return people;
    } else if (Math.abs(diff_x) > Math.abs(diff_y)) {
	diff_x<0 ? people.x = people.x-1 : people.x = people.x+1;
    } else {
	diff_y<0 ? people.y = people.y-1 : people.y = people.y+1;
    }
    return people;
}

function run_level(n) {
    var level = levels[n];
    var attacks_html = "";
    people = [];
    taints = [];
    init_people(level.homes);
    people[0].sick_time = SICK_TIME;[0].got_sick = true;
    people[0].got_sick = true;
    document.getElementById("level_n").innerHTML = n+1;
    document.getElementById("level_name").innerHTML = level.name;
    level.attacks.forEach(function(a) {
    	attacks_html +=
    	    '<input id="'+a+'" name="attack" type="radio" value="'+a+'"/>' +
    	    '<label for="'+a+'">'+a+'</label><br>';
    });
    document.getElementById("attacks").innerHTML = attacks_html;
    document.getElementsByName('attack')[0].defaultChecked=true;
    loop(level.countdown, n, level);
}

function loop(countdown, n, level) {
    var places = level.places;
    var homes = level.homes;
    var is_sick = function(p) { return p.sick_time > 0; };
    var sicks = people.filter(is_sick);
    if (sicks.length) {
	if (countdown == 0) {
	    if (levels.length == n+1) {
		alert("Shame ! The virus made it thanks to you !");
		return true;
	    } else {
		alert("Virus is alive ! Let's move to next level !");
		return run_level(n+1);
	    }
	} else {
   	    var seconds = Math.floor(countdown*TIMEOUT/1000);
            document.getElementById("timer").innerHTML = seconds;
            document.getElementById("cases").innerHTML = sicks.length;
	}
    } else {
        if (confirm("Virus is dead. Try again ?")) {
            return run_level(n);
        } else {
            alert("Humanity wins, then.");
            return false;
	}
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_homes(homes);
    draw_places(places);
    update_taints();
    people.forEach(function(p, i) {
    	if (p.sick_time > 0) {
    	    if ((p.sick_time == 1) && (Math.random() < DEATH_ODDS)) {
                p.status="dead";
    	    }
    	    p.sick_time--;
    	}

    	if (p.status == "at" && p.place_id == "home") {
    	    if (Math.random() > level.confinment) {
	  	var place_id = Math.floor(Math.random() * places.length);
                var place = places[place_id];
                p.status = "going_to";
                p.place_id = place_id;
                move_to(p, i, place.x, place.y);
	    }
	} else if (p.status == "at") {
	    var for_time = p.for;
	    var place_id = p.place_id;
	    var place = places[place_id];
	    if (for_time > place.stay_time) {
	  	var home = homes[p.home_id];
	  	p.status = "going_back";
	  	p.place_id = "home";
	  	move_to(p, i, home.x, home.y);
	    } else {
	  	p.for = p.for+1;
	    }
	} else if (p.status == "going_back") {
            var home = homes[p.home_id];
	    move_to(p, i, home.x, home.y);
	} else if (p.status == "going_to") {
	    var place = places[p.place_id];
	    move_to(p, i, place.x, place.y);
	} else if (p.status != "dead") {
	    alert("unknown status : " + p.status);
	}
	may_get_sick(p);
	draw_people(p);
    });
    setTimeout(function() { loop(countdown-1, n, level, people);}, TIMEOUT);
}

canvas.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    var canvasPosition = canvas.getBoundingClientRect();
    var x = e.pageX - canvasPosition.left;
    var y = e.pageY - canvasPosition.top;
    var sicks = sick_at(x,y);
    if (sicks.length) {
        var attack_name = document.querySelector('input[name=attack]:checked').value;
        var attack = attacks[attack_name];
        var first_sick = sicks[0];
        attack_sound(attack_name);
        // use people x,y not click's to match future visits
        add_taint(attack, first_sick.x, first_sick.y);
    } else {
  	show_message("No sick person here");
    }
    return false;
});

function show_message (msg) {
    var messages = document.getElementById("messages");
    var div = document.createElement("div");
    div.innerHTML = msg;
    messages.appendChild(div);
    setTimeout(function() {messages.removeChild(div);}, 3000); 
}

function sick_at (x, y) {
    var check = function(p) {
	return p.sick_time > 0 &&
	    (Math.abs(x-p.x) < PRECISION) &&
	    (Math.abs(y-p.y) < PRECISION);
    }
    return people.filter(check);
}

function add_taint(attack, x, y) {
    var taint = {x : x, y:y, attack:attack, duration:attack.duration};
    taints.push(taint);
}

function attack_sound(attack_name) {
    var sound = document.getElementById("attack_" + attack_name);
    sound.play();
}
