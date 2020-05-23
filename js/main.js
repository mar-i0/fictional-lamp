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

initPlayer('.player37', {
    audioSrc: '37 enemigodelmgtow-hombrelibre-ivoox39797034.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'El enemigo del MGTOW'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player38', {
    audioSrc: '38 bellezamujeres-hombrelibre-ivoox39797367.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'La belleza de las mujeres'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player39', {
    audioSrc: '39 mgtowteestaarruinandovida-hombrelibre-ivoox39797954.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'El MGTOW te está arruinando la vida'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player40', {
    audioSrc: '40 nopaguestragosocena-hombrelibre-ivoox39798428.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Deja de invitar a cubatas a las mujeres'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player41', {
    audioSrc: '41 pildoritarojaparainfiltrados-hombrelibre-ivoox39799259.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Pildorita roja para los infiltrados'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player42', {
    audioSrc: '42 tardeotempranomurollegara-hombrelibre-ivoox39805130.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Tarde o temprano el muro llegará'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player43', {
    audioSrc: '43 yonosesiesehijoesmio-hombrelibre-ivoox39805298.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Yo no sé, si ese hijo es mio...'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player44', {
    audioSrc: '44 pruebasmierda-hombrelibre-ivoox39805397.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Las mujeres y sus pruebas de mierda'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player45', {
    audioSrc: '45 queridochicobuenoantesnoestabalist-hombrelibre-ivoox39805576.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Querido chico bueno...'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player46', {
    audioSrc: '46 recuerdosbaulchemorpheusneo-hombrelibre-ivoox39806041.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Recuerdos desde el baul a Che Morpheus'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player47', {
    audioSrc: '47 resenaelvarondomadoesthervilar-hombrelibre-ivoox39806353.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Reseña a el varón domado de Esther Vilar'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player48', {
    audioSrc: '48 tomleykiscuandomujeresseestampanconelmuro-hombrelibre-ivoox39806450.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Tom Leykis: Cuando las mujeres se estampan contra el muro'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player49', {
    audioSrc: '49 tomacontrolsobretusmiedostusinsegu-hombrelibre-ivoox39806947.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Toma control sobre tus miedos e inseguridades'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player50', {
    audioSrc: '50 yanoexistenhombresbuenos-hombrelibre-ivoox39807522.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: '¿Ya no existen hombres buenos? No me jodas...'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player51', {
    audioSrc: '51 deberiaserasi-hombrelibre-ivoox40028122.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Deberías ser así'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player52', {
    audioSrc: '52 despertandoahombres-hombrelibre-ivoox40051449.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Despertando a los hombres'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player53', {
    audioSrc: '53 pormujeresodiancristianismo-hombrelibre-ivoox40051742.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Las mujeres odian al Cristianismo'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player54', {
    audioSrc: '54 queesloquierenmujeres-hombrelibre-ivoox40052019.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Qué es lo que quieren las mujeres'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player55', {
    audioSrc: '55 queotorganrelacionescomprometidas-hombrelibre-ivoox40055679.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: '¿Qué otorgan a un hombre las relaciones comprometidas?'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player56', {
    audioSrc: '56 sociopatiafemenina-hombrelibre-ivoox40055805.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Sociopatía Femenina'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player57', {
    audioSrc: '57 wgtow-hombrelibre-ivoox40055918.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'MGTOW Hombre Libre'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player58', {
    audioSrc: '58 amornuncaestuvoahi-hombrelibre-ivoox40056813.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'El amor nunca estuvo ahí'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player59', {
    audioSrc: '59 todasmujeressonputasoriginal-hombrelibre-ivoox42255699.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Todas las mujeres son...'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player60', {
    audioSrc: '60 argumentoemocionalentoncestumadrees-hombrelibre-ivoox42377795.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Todas las mujeres son...'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player61', {
    audioSrc: '61 respuestaparasubscriptorjm-hombrelibre-ivoox42378889.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Respuesta al suscriptor JM'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player62', {
    audioSrc: '62 comocombatirsoledad-hombrelibre-ivoox42379462.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Como combatir la soledad'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player63', {
    audioSrc: '63 comodeboeducaramihija-hombrelibre-ivoox42379807.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Como educar a mi hija'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player64', {
    audioSrc: '64 congresistacostarricencerelatasudivo-hombrelibre-ivoox42379880.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'congresista Costaricense relata su divorcio (desgarrador)'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player65', {
    audioSrc: '65 despotriqueinminente-hombrelibre-ivoox42379941.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Despotrique inminente'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player66', {
    audioSrc: '66 directosobreinfiltradosfilosofiamgto-hombrelibre-ivoox42380062.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Directo sobre infiltrados en la filosofía MGTOW'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player67', {
    audioSrc: '67 directochemorpheusoyemgtow-hombrelibre-ivoox42544916.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Directo Che Morpheus y MGTOW'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player68', {
    audioSrc: '68 hombrepildoraazul-hombrelibre-ivoox42544961.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Hombre pildora azul'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player69', {
    audioSrc: '69 plankalergi-hombrelibre-ivoox42588690.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Plan Kalergi'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player70', {
    audioSrc: '70 pornomasturbacion-hombrelibre-ivoox42588879.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'El porno y la masturbación'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player71', {
    audioSrc: '71 esmgtowparteconspiracioni-hombrelibre-ivoox42588943.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: '¿Es MGTOW parte de una conspiración?'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player72', {
    audioSrc: '72 esmgtowparteconspiracionii-hombrelibre-ivoox42589040.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: '¿Es MGTOW parte de una conspiración? (segunda parte)'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player73', {
    audioSrc: '73 esmgtowparteconspiracioniii-hombrelibre-ivoox42589091.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: '¿Es MGTOW parte de una conspiración? (tercera parte)'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player74', {
    audioSrc: '74 esnormalefebofilia-hombrelibre-ivoox42591760.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: '¿Es normal la efebofilia?'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player75', {
    audioSrc: '75 hombresbuscavalidacionfemenina-hombrelibre-ivoox42647437.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Los hombres buscan validación femenina'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player76', {
    audioSrc: '76 hombressigma-hombrelibre-ivoox42647461.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Hombres Sigma'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player77', {
    audioSrc: '77 inteligenciamaculina-hombrelibre-ivoox42932645.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Inteligencia Masculina'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player78', {
    audioSrc: '78 j peterson hipergamia mgtow-hombrelibre-ivoox42960525.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Jordan Peterson: Hipergamia'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player79', {
    audioSrc: '79 gavinmcinnesdagiro180grados-hombrelibre-ivoox42960589.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Gavin Mcinnes da giro 180 grados'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player80', {
    audioSrc: '80 crudaverdadacercadelbitcoin-hombrelibre-ivoox42960688.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'La cruda verdad acerca del bitcoin'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player81', {
    audioSrc: '81 modelosinstagrami-hombrelibre-ivoox42960786.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Modelos Instagram'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player82', {
    audioSrc: '82 matriarcadosegunrobertbriffault-hombrelibre-ivoox42960746.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'El matriarcado segun Robert Briffault'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player83', {
    audioSrc: '83 modelosinstagramii-hombrelibre-ivoox42960819.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Modelos de instagram (segunda parte)'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player84', {
    audioSrc: '84 mujeresvstrans-hombrelibre-ivoox42960878.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Mujeres vs Trans'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player85', {
    audioSrc: '85 noteapeguesamujerdepende-hombrelibre-ivoox42960907.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Mujeres vs Trans'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player86', {
    audioSrc: '86 nohaylideresmgtowrespuestaafidelio-hombrelibre-ivoox42960940.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'No hay lideres MGTOW (Respuesta a Fidelio)'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player87', {
    audioSrc: '87 notuvosexoporquenoquisomandarmeun-hombrelibre-ivoox42961021.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'No tuvo sexo porque...'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player88', {
    audioSrc: '88 antifeministas-hombrelibre-ivoox42961069.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Antifeministas'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player89', {
    audioSrc: '89 mujeresactivistasderechoshombres-hombrelibre-ivoox42961099.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Mujeres activistas derechos de los hombres'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player90', {
    audioSrc: '90 mujeresrobotsinteligenciaartificialu-hombrelibre-ivoox42961139.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Mujeres y robots con inteligencia artificial'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player91', {
    audioSrc: '91 sinceridademocional-hombrelibre-ivoox42961189.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Sinceridad emocional'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player92', {
    audioSrc: '92 directolacrudaverdadi-hombrelibre-ivoox42961244.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Directo la crudad verdad (primera parte)'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player93', {
    audioSrc: '93 directolacrudaverdadii-hombrelibre-ivoox42961309.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Directo la crudad verdad (segunda parte)'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player94', {
    audioSrc: '94 directocelebrando4milsuscriptores-hombrelibre-ivoox42961392.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Directo celebrando 4000 suscriptores'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player95', {
    audioSrc: '95 advertencianeopodcast6-hombrelibre-ivoox46129737.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Advertencia Neo Podcast'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player96', {
    audioSrc: '96 hablemosrealidad-hombrelibre-ivoox46672207.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Hablemos de la realidad'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player97', {
    audioSrc: '97 lopiensanmujeresdelatractivofisico-hombrelibre-ivoox46966502.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Lo que piensan las mujeres del atractivo físico'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player98', {
    audioSrc: '98 hombrealfavselhombrebeta-hombrelibre-ivoox47020862.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Hombres Alfa vs Hombres Beta'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player99', {
    audioSrc: '99 alfaelbetamujer-hombrelibre-ivoox47198354.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'El Alfa, el Beta y la mujer'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player100', {
    audioSrc: '100 - mujereshombresnosomoscompatibles-hombrelibre-ivoox47567697.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Las mujeres y los hombres no somos compatibles'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player101', {
    audioSrc: '101 - neopodcast1-hombrelibre-ivoox46129579.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Neo Podcast 1'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player102', {
    audioSrc: '102 - neopodcast2-hombrelibre-ivoox46129626.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Neo Podcast 2'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player103', {
    audioSrc: '103 - neopodcast3-hombrelibre-ivoox46129677.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Neo Podcast 3'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player104', {
    audioSrc: '104 - neopodcast4-hombrelibre-ivoox46129701.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Neo Podcast 4'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player105', {
    audioSrc: '105 - neopodcast5-hombrelibre-ivoox46129710.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Neo Podcast 5'
}, {
    on: true,
    lineColor: '#e74c3c'
});

initPlayer('.player106', {
    audioSrc: '106 - neopodcast6-hombrelibre-ivoox46129726.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: 'Neo Podcast 6'
}, {
    on: true,
    lineColor: '#e74c3c'
});


initPlayer('.player107', {
    audioSrc: '107 - quehapasadocomunidadmgtowhl-hombrelibre-ivoox47406865.mp3',
    imageSrc: 'img/redpill.jpg',
    title: 'Neo Oculorum / Advent',
    date: '22.05.2020',
    description: '¿Qué ha pasado con la comunidad MGTOW?'
}, {
    on: true,
    lineColor: '#e74c3c'
});







