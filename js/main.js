(function() {
    var allPlayers = [],
        isInit = false,
        audio = document.createElement('audio');

    audio.className = 'podcast__audio';
    audio.crossOrigin = "anonymous";

    var ctx = new(window.AudioContext || window.webkitAudioContext)(),
        source = ctx.createBufferSource(),
        audioSrc = ctx.createMediaElementSource(audio);

    audioSrc.connect(ctx.destination);

    function initPlayers(eq) {
        var players = document.querySelectorAll('.podcast'),
            playersLength = players.length;

        for (var i = 0; i < playersLength; i++) {
            allPlayers.push(new player(players[i], eq));
            allPlayers[i]._init();
        }
    }

    function initPlayer(element, info, eq) {
        var inPlayer = document.querySelector(element),
            playersLength = allPlayers.length;

        createPlayer(inPlayer, info);

        allPlayers.push(new player(inPlayer, eq));

        allPlayers[playersLength]._init();
    }

    window.addEventListener('resize', function() {
        for (var i = 0; i < allPlayers.length; i++) {
            if (allPlayers[i].isInit) {
                allPlayers[i].reDraw();
            }
        }
    }, true);

    var player = function(player, eq) {
        var this_ = this;
        this.player = player;
        this.eq = eq.on || false;
        this.isPlaying = false;
        this.controlBtn = this.player.querySelector('.podcast__control');
        this.currLine = this.player.querySelector('.line__current');
        this.currTime = this.player.querySelector('.time__current');
        this.fullTime = this.player.querySelector('.time__full');
        this.timeLine = this.player.querySelector('.time__line');
        this.fullVol = this.player.querySelector('.podcast__volume');
        this.currVol = this.player.querySelector('.volume-line');
        this.canvas = this.player.querySelector('canvas') || false;
        this.podcastMeta = this.player.querySelector('.podcast__meta');
        this.visual = this.player.querySelector('.podcast__visual');
        this.visualProgress = this.player.querySelector('.visual__progress');
        this.mTimeDown = false;
        this.mVolumeDown = false;
        this.playNow = false;
        this.isInit = false;
        this.visualData = {
            width: eq.width || this_.podcastMeta.offsetWidth,
            height: eq.height || 200,
            bg: eq.bg || false,
            textColor: eq.textColor || '#fff',
            lineColor: eq.lineColor || '#000000',
            linesLength: eq.linesLength || 1000
        };

        this._init = function() {
            this.controlBtn.addEventListener('click', this.controls);
            audio.addEventListener('timeupdate', this.updateTime);
            this.timeLine.addEventListener('mousedown', this.setTimeClick);
            this.timeLine.addEventListener('mousemove', this.setTimeMove);
            this.timeLine.addEventListener('mouseup', this.onTimeUp);
            this.timeLine.addEventListener('mouseleave', this.onTimeUp);
            this.fullVol.addEventListener('mousedown', this.setVolumeClick);
            this.fullVol.addEventListener('mousemove', this.setVolumeMove);
            this.fullVol.addEventListener('mouseup', this.onVolumeUp);
            this.fullVol.addEventListener('mouseleave', this.onVolumeUp);
            audio.addEventListener("ended", this.ended);
            audio.volume = 0.5;
            this_.visualData.textColor ? this_.podcastMeta.style.color = this_.visualData.textColor : false;
            this_.visualData.bg ? this_.podcastMeta.style.background = this_.visualData.bg : false;
        };

        this.buffer = function() {
            this.canvasCtx = this.canvas.getContext('2d');

            this.request = new XMLHttpRequest();

            this.request.open('GET', audio.src, true);

            this.request.responseType = 'arraybuffer';

            this.request.onload = function() {
                this_.audioData = this_.request.response;

                ctx.decodeAudioData(this_.audioData, function(buffer) {
                        this_.buffer = buffer;
                        this_.leftChannel = buffer.getChannelData(0);

                        this_.draw();

                        this_.fullTime.innerHTML = formatTime(audio.duration) || '00:00:00';
                        this_.visual.setAttribute('class', 'podcast__visual podcast__visual--loaded');
                        this_.player.setAttribute('class', 'podcast podcast--playing');

                        this_.isInit = true;
                    },

                    function(e) {
                        "Error with decoding audio data" + e.err
                    });

            }

            this.request.send();
        }

        this.stop = function() {
            audio.pause();
            audio.currentTime = 0;
            this_.currTime.innerHTML = '00:00:00';
            this_.currLine.style.width = '0%';
            this_.visualProgress.style.width = '0%';
            this_.isPlaying = false;
            this_.playNow = false;
            this_.controlBtn.setAttribute('class', 'podcast__control podcast__play');
            this_.player.setAttribute('class', 'podcast');
        }

        this.controls = function() {
            if (hasClass(this_.controlBtn, 'podcast__play')) {
                if (!this_.playNow) {
                    for (var i = 0; i < allPlayers.length; i++) {
                        allPlayers[i].stop();
                    }
                    audio.src = this_.player.dataset.src;
                    if (this_.eq && this_.canvas && !this_.isInit) {
                        this_.buffer();
                    }

                    audio.volume = getStyle(this_.currVol, 'left').slice(0, -2) / getStyle(this_.fullVol, 'width').slice(0, -2);
                }
                this_.controlBtn.setAttribute('class', 'podcast__control podcast__pause');

                if (!this_.isInit) {
                    this_.player.setAttribute('class', 'podcast podcast--playing podcast--loading');
                } else {
                    this_.player.setAttribute('class', 'podcast podcast--playing');
                }

                audio.play();
                this_.isPlaying = true;
                this_.playNow = true;
            } else {
                this_.controlBtn.setAttribute('class', 'podcast__control podcast__play');
                this_.isInit ? this_.player.setAttribute('class', 'podcast') : false;

                audio.pause();
                this_.isPlaying = false;
            }
        };

        this.updateTime = function() {
            if (this_.isPlaying) {
                var time = this.currentTime;
                this_.currTime.innerHTML = formatTime(time);
                this_.currLine.style.width = (time * 100) / audio.duration + '%';
                this_.visualProgress.style.width = (time * 100) / audio.duration + '%';
            }
        };

        this.setVolume = function(e) {
            var x, setVolume, setLeft, nowWidth,
                volLineWidth = this_.fullVol.offsetWidth;

            if (e.pageX) {
                x = e.pageX;
            } else {
                x = e.clientX;
            }

            nowWidth = x - this_.fullVol.getBoundingClientRect().left;
            setLeft = (nowWidth * 100) / volLineWidth;

            this_.currVol.style.left = setLeft + '%';

            audio.volume = setLeft / 100;
        };

        this.setVolumeClick = function(e) {
            this_.mVolumeDown = true;
            this_.setVolume(e);
        };

        this.onVolumeUp = function() {
            this_.mVolumeDown = false;
        };

        this.setVolumeMove = function(e) {
            if (this_.mVolumeDown) {
                this_.setVolume(e);
            }
        }

        this.setTime = function(e) {
            var x, setTime, setWidth, nowWidth,
                timeLineWidth = this_.timeLine.offsetWidth;
            if (!this_.playNow) {
                for (var i = 0; i < allPlayers.length; i++) {
                    allPlayers[i].stop();
                }
            }
            this_.playNow = true;
            audio.pause();

            if (e.pageX) {
                x = e.pageX;
            } else {
                x = e.clientX;
            }

            nowWidth = x - this_.timeLine.getBoundingClientRect().left;
            setWidth = (nowWidth * 100) / timeLineWidth;

            this_.currLine.style.width = setWidth + '%';

            audio.currentTime = (setWidth * audio.duration) / 100;
        };

        this.setTimeClick = function(e) {
            this_.mTimeDown = true;
            this_.setTime(e);
        };

        this.setTimeMove = function(e) {
            if (this_.mTimeDown) {
                this_.setTime(e);
            }
        };

        this.onTimeUp = function() {
            this_.mTimeDown = false;
            this_.isPlaying ? audio.play() : false;
        };

        this.ended = function() {
            this_.stop();
        };

        this.draw = function() {
            this_.canvas.width = this_.visualData.width;
            this_.canvas.height = this_.visualData.height;

            drawVisual();
        };

        this.reDraw = function() {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;

            drawVisual();
        };

        function drawVisual() {
            this_.canvasCtx.clearRect(0, 0, this_.canvas.width, this_.canvas.height);

            this_.canvasCtx.strokeStyle = this_.visualData.lineColor;
            this_.canvasCtx.translate(0, this_.canvas.height / 2);
            this_.canvasCtx.lineWidth = 1;

            var totallength = this_.leftChannel.length;
            var eachBlock = Math.floor(totallength / this_.visualData.linesLength);
            var lineGap = (this_.canvas.width / this_.visualData.linesLength);

            this_.canvasCtx.beginPath();

            for (var i = 0; i <= this_.visualData.linesLength; i++) {
                var audioBuffKey = Math.floor(eachBlock * i);
                var x = i * lineGap;
                var y = this_.leftChannel[audioBuffKey] * this_.canvas.height / 2;
                this_.canvasCtx.moveTo(x, y);
                this_.canvasCtx.lineTo(x, (y * -1));
            }
            this_.canvasCtx.stroke();
            this_.canvasCtx.restore();
        }
    };

    function createPlayer(el, info) {
        var classes = el.getAttribute('class');
        el.setAttribute('data-src', info.audioSrc);
        el.setAttribute('class', 'podcast ' + classes);

        var plr = '<div style="background-image: url(' + info.imageSrc + ')" class="podcast__cover">\
                                    <div class="podcast__volume volume">\
                                        <div class="volume-full"></div>\
                                        <div class="volume-line"></div>\
                                    </div>\
                                    <div class="podcast__control podcast__play"></div>\
                                    <div class="podcast__loader"></div>\
                                    <div class="podcast__time time">\
                                        <div class="time__current">00:00:00</div>\
                                        <div class="time__line">\
                                            <div class="line__current"></div>\
                                        </div>\
                                        <div class="time__full">00:00:00</div>\
                                    </div>\
                                </div>\
                                <div class="podcast__meta">\
                                    <div class="podcast__visual">\
                                        <div class="visual__progress"></div>\
                                        <canvas></canvas>\
                                    </div>\
                                    <div class="podcast__text">\
                                        <h3 class="podcast__title">' + info.title + '</h3>\
                                        <p class="podcast__date">' + info.date + '</p>\
                                        <p class="podcast__desc">' + info.description + '</p>\
                                    </div>\
                                </div>';

        el.innerHTML = plr;
    }

    window.initAll = initPlayers;
    window.initPlayer = initPlayer;
})();

function hasClass(elem, className) {
    return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
}

function formatTime(time) {
    var timeArr = [Math.floor(((time % 31536000) % 86400) / 3600),
        Math.floor((((time % 31536000) % 86400) % 3600) / 60),
        ((((time % 31536000) % 86400) % 3600) % 60)
    ];

    timeArr[2] = timeArr[2].toString().split('.')[0];

    for (var i = 0; i < timeArr.length; i++) {
        if (timeArr[i] < 10) {
            timeArr[i] = '0' + timeArr[i];
        };
        i != 2 ? timeArr[i] += ':' : false;
    }
    return timeArr[0] + timeArr[1] + timeArr[2];
}

function getStyle(el, style) {
    var styles = window.getComputedStyle(el);

    return styles.getPropertyValue(style);
}


initPlayer('.player-one', {
    audioSrc: '01 todasmujeressonedicionespecial-hombrelibre-ivoox39753208.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Todas las mujeres son... (Edición especial)'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player-two', {
    audioSrc: '02 comoencontrarsitunoviaesposateest-hombrelibre-ivoox39753481.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Como saber si tu novia/esposa te está engañando'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player3', {
    audioSrc: '03 comosuperarenamoramiento-hombrelibre-ivoox39753845.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Como superar el enamoramiento'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player4', {
    audioSrc: '04 loshombresyanoquierenhijos-hombrelibre-ivoox39754033.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Los hombres ya no quieren tener hijos'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player5', {
    audioSrc: '05 pormujeresseoponenala-hombrelibre-ivoox39754149.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: '¿Por qué las mujeres se oponen a la prostitución?'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player6', {
    audioSrc: '06 belladepaulocasartetehacemasfeliz-hombrelibre-ivoox39754247.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Casarte no hace más feliz'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player7', {
    audioSrc: '07 camaraderiasupervivencia-hombrelibre-ivoox39754358.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Camaraderia y supervivencia'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player8', {
    audioSrc: '08 condicionamientosocial-hombrelibre-ivoox39756359.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Condicionamiento Social'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player9', {
    audioSrc: '09 consejosparamantenerestilovidasano-hombrelibre-ivoox39757736.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Consejos para mantener un estilo de vida sano'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player10', {
    audioSrc: '10 cuandomujerestebuscana30-hombrelibre-ivoox39758035.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Cuando las mujeres te buscan a los 30'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player11', {
    audioSrc: '11 valormercadosexual-hombrelibre-ivoox39758485.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Valor de mercado social'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player12', {
    audioSrc: '12 ellanotevaaamar-hombrelibre-ivoox39758890.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Ella no te va a amar'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player13', {
    audioSrc: '13 ellasseodianasimismas-hombrelibre-ivoox39759291.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Ellas se odian así mismas'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player14', {
    audioSrc: '14 estacompletamentebiennosermgtowten-hombrelibre-ivoox39759515.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Está completamente bien NO ser MGTOW'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player15', {
    audioSrc: '15 evitaamadressolteras-hombrelibre-ivoox39759684.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Evita a las madres solteras'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player16', {
    audioSrc: '16 hemostenidomalospadres-hombrelibre-ivoox39759945.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Cuando hemos tenido malos padres...'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player17', {
    audioSrc: '17 crudaverdadacercadiscotecas-hombrelibre-ivoox39760263.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'La cruda verdad acerca de las discotecas'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player18', {
    audioSrc: '18 culturavi0lacionesrealmgtow-hombrelibre-ivoox39760472.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'La cultura de las violaciones'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player19', {
    audioSrc: '19 falsadeidadfemenina-hombrelibre-ivoox39760721.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'La falsa deidad femenina'
}, {
    on: true,
    lineColor: '#e74c3c'
});



initPlayer('.player20', {
    audioSrc: '20 ideologiagenerocomometodocontrol-hombrelibre-ivoox39760935.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Ideología de género (y control)'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player21', {
    audioSrc: '21 independenciareal-hombrelibre-ivoox39761185.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Independencia real del hombre libre'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player22', {
    audioSrc: '22 mujerunicornionawalt-hombrelibre-ivoox39761545.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'La mujer unicornio (NAWALT)'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player23', {
    audioSrc: '23 prostitucionreguladaesbeneficiosapar-hombrelibre-ivoox39761809.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'La prostitución regulada es buena para el hombre'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player24', {
    audioSrc: '24 realidadcosas-hombrelibre-ivoox39788610.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'La realidad de las cosas'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player25', {
    audioSrc: '25 teoriatelegonia-hombrelibre-ivoox39789296.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Teoria sobre la Telegonia'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player26', {
    audioSrc: '26 mujeresintegranadnsushijos-hombrelibre-ivoox39789692.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Mujeres integran a sus hijos'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player27', {
    audioSrc: '27 mujeresodianserignoradas-hombrelibre-ivoox39790023.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Las mujeres odian ser ignoradas'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player28', {
    audioSrc: '28 lopiensanmujerescuandoseestampan-hombrelibre-ivoox39790278.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Lo que piensan las mujeres cuando se estampan contra el muro'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player29', {
    audioSrc: '29 hombresherviborosjaponeses-hombrelibre-ivoox39790640.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Los hombres hervíboros japoneses'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player30', {
    audioSrc: '30 mgtowesrealidadnomovimiento-hombrelibre-ivoox39795032.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'La filosofia MGTOW es una realidad'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player31', {
    audioSrc: '31 miraamujeresloson-hombrelibre-ivoox39795243.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Mira a las mujeres por lo que son'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player32', {
    audioSrc: '32 motivacionmgtow-hombrelibre-ivoox39795726.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Motivación MGTOW'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player33', {
    audioSrc: '33 mujereslesbianasbisexuales-hombrelibre-ivoox39796047.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Mujeres Lesbianas Bisexuales'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player34', {
    audioSrc: '34 comoconocermujeresa20-hombrelibre-ivoox39796388.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Como conocer mujeres a los 20'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player35', {
    audioSrc: '35 comofuncionasistema-hombrelibre-ivoox39796562.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Como funciona el sistema'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player36', {
    audioSrc: '36 quesorprendemasahombresacercade-hombrelibre-ivoox39796818.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Qué sorprende más a los hombres'
}, {
    on: true,
    lineColor: '#e74c3c'
});




