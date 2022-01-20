'use strict';

import SceneBase from './scenebase.js';
import GLUtil from './glutil.js';
//import StringUtil from './strutil.js';
import {Ramiel,Pipe,Universe} from './model.js';
import MU from './matutil.js';
import QU from './quatutil.js';
import OffScreen from './offscreen.js';
import {Controller} from './controller.js';
import SU from './glslutil.js';
// 遷移先
//import StartScene from './scene_start.js';

////import * as THREE from 'https://unpkg.com/three/build/three.module.js';


const vshader = `\
#version 300 es

// Inputs:
in vec3 pos;
in vec3 coli;
in vec3 normal;

// Divisor:
in vec3 scale; // sx, sy, sz
in vec4 quat;  // qx, qy, qz, qw
in vec3 shift; // mx, my, mz

// Uniform:
uniform mat4 vMat;
uniform vec3 camPos;
uniform mat4 pMat;
uniform vec2 XYlim;

// Outputs:
out vec3 wpos;
out vec3 nvec;
out vec3 vvec;
out vec3 colo;

vec4 qmul(vec4 B, vec4 A){
    return vec4(
      + B.w * A.x - B.z * A.y + B.y * A.z + B.x * A.w,
      + B.z * A.x + B.w * A.y - B.x * A.z + B.y * A.w,
      - B.y * A.x + B.x * A.y + B.w * A.z + B.z * A.w,
      - B.x * A.x - B.y * A.y - B.z * A.z + B.w * A.w
    );
}

vec3 rotate(vec3 v, vec4 quat) {
    vec4 q0 = normalize(quat);///quat / length(quat);
    vec4 vq = vec4( v, 0.0 );                   // 座標
    vec4 cq = vec4( -1.0,-1.0,-1.0, 1.0 )*q0;   // q0 の共役
    return qmul( qmul(cq, vq), q0).xyz;
}

vec4 world_pos(vec3 pos, vec3 scale, vec4 quat, vec3 shift){
    // pos   : モデル座標系座標
    // scale : 拡大縮小
    // quat  : 姿勢
    // shift : 平行移動

    // scaling
    vec3 pos1 = scale*pos;
    // rotate
    vec3 pos2 = rotate(pos1, quat);
    // shift
    vec3 pos3 = pos2 + shift;

    return vec4(pos3, 1.0);
}

void main() {
    colo = coli;
    wpos = world_pos(pos, scale, quat, shift).xyz;  // 世界座標
    nvec = rotate(normal, quat);                    // 法線ベクトル
    vvec = normalize(camPos - wpos);                // カメラ方向ベクトル
    vec4 position = (pMat*vMat) * vec4(wpos, 1.0);
    gl_Position = position / vec4(XYlim,1.0,1.0);
}
`;

const fshader = `\
#version 300 es
precision mediump float;

in vec3 wpos;
in vec3 nvec;
in vec3 vvec;
in vec3 colo;

uniform vec2 XYlim2;
uniform vec2 sXYlim;
uniform vec2 resolution;
uniform int isBackground;

out vec4 color_out;

IMPORT_GLSLSNIPPET

vec4 shading(vec3 vcolor, vec3 wpos, vec3 nvec, vec3 vvec){
    return vec4(vcolor*0.5, 1.0)
                    + vec4( ambientShadeD(     wpos, nvec ), 1.0)
                    + vec4( directionalShadeD( wpos, nvec ), 1.0)
                    + vec4( pointShadeD(       wpos, nvec ), 1.0);
}

void main() {
    vec4 color;
    if(isBackground>0){
        color = vec4(0.1,0.2,0.2,1.0);
    }else{
        color = shading( colo, wpos, nvec, vvec );
    }
    color = vec4( clamp(color.x,0.0,1.0),
                  clamp(color.y,0.0,1.0),
                  clamp(color.z,0.0,1.0),
                  clamp(color.w,0.0,1.0) );

    // 画面上の座標によって安全エリア外は暗くする
    vec2 dpos = (gl_FragCoord.xy/resolution.xy*2.0-1.0)*XYlim2.xy;
    if( dpos.x<-sXYlim.x || dpos.x>sXYlim.x || dpos.y<-sXYlim.y || dpos.y>sXYlim.y ){
        float base = min(sXYlim.x,sXYlim.y);
        float d = length(vec2( max( abs(dpos.x)-sXYlim.x, 0.0 ),
                               max( abs(dpos.y)-sXYlim.y, 0.0 ) ));
        color_out = color*exp(-d*base*2.0);
    }else{
        color_out = color;
    }

    //color_out = vec4(1.0); // debug : vertex posisions

}

`.replace('IMPORT_GLSLSNIPPET', SU.shader);


// 土管
class PipeObj {
    constructor(gentime, direction, posY) {
        this.gentime = gentime; // ms
        this.direction = direction; // +1 or -1
        this.quat = QU.gen( [1,0,0], direction>0 ? 0 : 180 );
        this.posY = posY;
    }
}

// ステージ
class Level {
    constructor(timer,radius) {
        this.timer = timer;
        this.stat_time = this.timer.tmpTime;
        this.radius = radius;

        this.freq = 1500;
        this.inf = 1000;
        this.Zspeed = -3; // m/s
        this.Zstart = 30;
        this.Zend = -30;
        this.Zinit = 10; // ゲーム開始時に一番近い土管
        this.difficulty = 2; // 通り道の最難移動幅

        this.last_time = null;// 最後に生成チェックをした時刻
        this.steps_from_lastgen = this.inf; // 最後に土管が生成されたのが何ステップ前か
        this.prev_upper_limit = this.inf;   // 最後に作った通り道の上限
        this.prev_lower_limit = -this.inf;  // 最後に作った通り道の下限

        // 通り道を作れる限界の場所
        const path_height = 5;
        this.path_upper_limit = path_height;
        this.path_lower_limit = -path_height;
        this.path_min_height = 2;
        this.path_max_height = 5;
        // キャラクターが入ったら死ぬエリア
        this.dead_upper_limit = path_height*2;
        this.dead_lower_limit = -path_height*2;

        this.pipestack = [];

        this.pre_generate();
    }

    now_ms() {
        return this.timer.tmpTime-this.stat_time;
    }

    update() {
        // 生成タイミングが来ているか確認
        const now_ms = this.now_ms()
        const belong_time = Math.floor(now_ms/this.freq);
        const new_flag = this.last_time!==belong_time;
        // 生成タイミングが来ていたら
        if(new_flag){
            //console.log(belong_time);
            this.last_time = belong_time;
            this.steps_from_lastgen += 1;
            const timing_ms = Math.floor(now_ms/this.freq)*this.freq;
            this.generate( this.prev_upper_limit+this.difficulty*this.steps_from_lastgen,
                           this.prev_lower_limit-this.difficulty*this.steps_from_lastgen, timing_ms);
        }

        // TODO ここで先にデータを計算しておく
        this.calc_and_delete();
    }

    calc_and_delete() {
        const time_ms = this.now_ms();
        this.quats  = [];
        this.scales = [];
        this.shifts = [];
        let deleteCount = 0;
        this.collider = [];
        for(let i=0;i<this.pipestack.length;i++){
            const pipe = this.pipestack[i];
            const t = (time_ms-pipe.gentime)/1000;
            const z = this.Zstart + this.Zspeed*t;
            if(z<this.Zend){
                deleteCount++;
                continue;
            }
            // 衝突判定しなければいけないもの
            if(z-this.pipe_radius<this.pipe_radius && z+this.pipe_radius>-this.pipe_radius){
                this.collider.push([ pipe.direction, pipe.posY, z-this.pipe_radius, z+this.pipe_radius ]);
            }
            this.quats  = this.quats.concat(pipe.quat);
            this.scales = this.scales.concat([1,1,1]);
            const debug_ang = 60 /180*Math.PI;
            const [debug_sin,debug_cos] = [Math.cos(debug_ang), Math.sin(debug_ang)];
            this.shifts = this.shifts.concat([ z*debug_cos, pipe.posY, z*debug_sin ]);
        }
        this.pipestack.splice(0,deleteCount);
    }
    
    // 最初から生成おかないといけないもの
    pre_generate() {
        const passed = (this.Zinit-this.Zstart)/this.Zspeed; // 何秒前に生成されていたら初期位置に土管があるか
        const num = Math.floor((passed*1000)/this.freq);
        for(let i=num;i>=0;i--){
            const timing_ms = -this.freq*i;
            this.generate( this.prev_upper_limit+this.difficulty*this.steps_from_lastgen,
                           this.prev_lower_limit-this.difficulty*this.steps_from_lastgen, timing_ms);
        }
        this.last_time = 0;
    }

    generate( upper_limit, lower_limit, timing_ms ) {
        const ratios = [/*none*/  4, /*top*/ 1, /*bottom*/ 1,/*both*/ 2]; // 各状態の比率
        const total = ratios.reduce((s,e)=>s+e,0); // 比率の合計値
        const normRatios = ratios.map(v=>v/total); // 正規化済み比率
        const thress = normRatios.map( (s=>v=>s+=v)(0) ); // 閾値リスト = 正規化済み比率の累積和
        const p = Math.random(); // 乱数生成
        const status = thress.map(th=>p>th?1:0).reduce((s,e)=>s+e,0); // ステータス判定

        // 乱数生成
        // rand0 : 生成したい場所
        // rand1 : 隙間幅
        const [rand0,rand1] = [Math.random(),Math.random()];
        const path_height = this.path_max_height*rand1 + this.path_min_height*(1-rand1);
        const midY = (this.path_max_height-path_height*0.5)*rand0
                                + (this.path_lower_limit+path_height*0.5)*(1-rand0);
        let topY = midY + 0.5*path_height;
        let bottomY = midY - 0.5*path_height;
        // 前の隙間から遠すぎたら近くまで持ってくる
        const yshiftUp   = lower_limit<topY    ? 0 : lower_limit-topY;
        const yshiftDown = upper_limit>bottomY ? 0 : upper_limit-bottomY;
        if(yshiftUp>0 &&yshiftDown<0) console.log("generation error");
        
        topY = topY+yshiftUp+yshiftDown;
        bottomY = bottomY+yshiftUp+yshiftDown;

        switch(status){
            case 0: // 土管生成なし
                break;
            case 1: // 上にだけ土管生成
                this.prev_upper_limit = topY;
                this.prev_lower_limit = lower_limit;
                this.steps_from_lastgen = 0;
                this.pipestack.push( new PipeObj( timing_ms, -1, topY    ) );
                break;
            case 2: // 下にだけ土管生成
                this.prev_upper_limit = upper_limit;
                this.prev_lower_limit = bottomY;
                this.steps_from_lastgen = 0;
                this.pipestack.push( new PipeObj( timing_ms,  1, bottomY ) );
                break;
            case 3: // 上下に土管生成
                this.prev_upper_limit = topY;
                this.prev_lower_limit = bottomY;
                this.steps_from_lastgen = 0;
                this.pipestack.push( new PipeObj( timing_ms, -1, topY    ) );
                this.pipestack.push( new PipeObj( timing_ms,  1, bottomY ) );
                break;
            default:
                console.log('error generate status');
        }
    }

    // 土管の位置確認、生存制御
    get data() {
        ///// const time_ms = this.now_ms();
        ///// let quats  = [];
        ///// let scales = [];
        ///// let shifts = [];
        ///// let deleteCount = 0;
        ///// let collider = [];
        ///// for(let i=0;i<this.pipestack.length;i++){
        /////     const pipe = this.pipestack[i];
        /////     const t = (time_ms-pipe.gentime)/1000;
        /////     const z = this.Zstart + this.Zspeed*t;
        /////     if(z<this.Zend){
        /////         deleteCount++;
        /////         continue;
        /////     }
        /////     // 衝突判定しなければいけないもの
        /////     if(z-this.pipe_radius<this.pipe_radius && z+this.pipe_radius>-this.pipe_radius){
        /////         collider.push([ pipe.direction, pipe.posY, z-this.pipe_radius, z+this.pipe_radius ]);
        /////     }
        /////     quats  = quats.concat(pipe.quat);
        /////     scales = scales.concat([1,1,1]);
        /////     const debug_ang = 60 /180*Math.PI;
        /////     const [debug_sin,debug_cos] = [Math.cos(debug_ang), Math.sin(debug_ang)];
        /////     shifts = shifts.concat([ z*debug_cos, pipe.posY, z*debug_sin ]);
        ///// }
        ///// this.pipestack.splice(0,deleteCount);
        ///// return [ quats, scales, shifts, this.pipestack.length, collider ];
        return [ this.quats, this.scales, this.shifts,
                    this.pipestack.length, this.collider ];
    }
}


export default class GameScene extends SceneBase{

    static sceneName = 'GAME';

    scene_initialize(){
        // 画面の作成 (画面サイズやテクスチャサイズを記憶しておく)
        this.gameResolution = this.sceneMg.config.gameResolution;
        this.textureResolution = this.sceneMg.config.textureResolution;
        const [w,h] = this.gameResolution;
        this.offScreen = new OffScreen(h,w, 'webgl2', false, false);
        this.controller = new Controller( this.timer );

        // コントローラーの入力履歴
        this.ctrlHist = {'ArrowUp':{}, 'ArrowDown':{}, 'ArrowLeft':{}, 'ArrowRight':{},
                            'Enter':{}, ' '/*space*/:{}};

        // コンテキストも初期化しておく
        this.gl = this.offScreen.context;
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // 背景色 = 黒
        this.gl.enable(this.gl.CULL_FACE);
        this.program = GLUtil.createProgram(this.gl, vshader, fshader);
        this.gl.useProgram(this.program);

        // オブジェクト
        this.prevTime = this.timer.tmpTime;
        this.flow_objs = [];
    }

    enter() {
        // 解像度の設定を見て変更があればやり直し
        if( (this.gameResolution.toString() !== this.sceneMg.config.gameResolution.toString())
            || (this.textureResolution !== this.sceneMg.config.textureResolution) ){
            this.scene_initialize();
        }

        // 画面に映すものとしてこのシーンを設定、このシーンのコントローラーを有効化
        this.realScreen.setScene( this );
        this.controller.activate();

        // ゲームの中身を初期化
        this.content_initializer();
    }

    content_initializer() {
        // 描画設定はここでしておくと良い？
        // ゲームを中断して、中断していた状況に戻れるような状況が必要になる可能性も考慮

        this.pipe_radius = 1.0;
        // ステージの初期化
        this.level = new Level(this.timer, this.pipe_radius);

        // カメラ位置と画角を設定
        const camPos = [0,2,-10];
        const vMat = MU.mm( MU.camLookUpL(-10), MU.camMove(...camPos) );
        const pMat = MU.proj( 30, 1, 1, 1000);
        const camPosPtr = this.gl.getUniformLocation(this.program, 'camPos');
        const vMatPtr = this.gl.getUniformLocation(this.program, 'vMat');
        const pMatPtr = this.gl.getUniformLocation(this.program, 'pMat');
        this.gl.uniform3fv(camPosPtr, camPos);
        this.gl.uniformMatrix4fv(vMatPtr,  true /*=transpose*/, new Float32Array( vMat.flat() ));
        this.gl.uniformMatrix4fv(pMatPtr,  true /*=transpose*/, new Float32Array( pMat.flat() ));

        this.bgPtr = this.gl.getUniformLocation(this.program, 'isBackground');

        // オブジェクトを作成、最初は適当でよい
        const quat  = [ 1,0,0,0 ];
        const scale = [ 1.0, 1.0, 1.0 ];
        const shift = [ 0,0,0 ];

        // ラミエル
        ////const ramiel_color = [[1,0,0],[0,1,0],[0,0,1],[0,1,1],
        ////                      [1,0,1],[1,1,0],[0,0,0],[0.7,0.7,0.7]]; // debug
        const ramiel_color = [...Array(8)].map(()=>[0,0.8,1.0]);
        const ramiel = new Ramiel( ramiel_color );
        this.ramiel_length = ramiel.length;
        this.ramielVAO = GLUtil.createVAO( this.gl, this.program,
                                    [ramiel.vertices, ramiel.colors, ramiel.normals, quat,   scale,   shift   ],
                                    ['pos',           'coli',        'normal',       'quat', 'scale', 'shift' ],
                                    [null,            null,          null,           1,      1,       1,      ],
                                    [ramiel.vdim,     ramiel.cdim,   ramiel.ndim,    4,      3,       3,      ],
                                    ramiel.indices );
        // 背景
        const world = new Universe();
        this.world_length = world.length;
        this.worldVAO = GLUtil.createVAO( this.gl, this.program,
                                    [world.vertices, world.colors, world.normals, quat,   scale,   shift   ],
                                    ['pos',          'coli',       'normal',      'quat', 'scale', 'shift' ],
                                    [null,           null,         null,          1,      1,       1,      ],
                                    [world.vdim,     world.cdim,   world.ndim,    4,      3,       3,      ],
                                    world.indices);
        // 土管
        const pipe = new Pipe();
        this.pipe_length = pipe.length;
        this.pipeVAO = GLUtil.createVAO( this.gl, this.program,
                                    [pipe.vertices, pipe.colors,  pipe.normals, quat,   scale,   shift   ],
                                    ['pos',         'coli',       'normal',     'quat', 'scale', 'shift' ],
                                    [null,          null,         null,         1,      1,       1,      ],
                                    [pipe.vdim,     pipe.cdim,    pipe.ndim,    4,      3,       3,      ],
                                    pipe.indices);

        ///this.ch = { 'gravity'         : -3,
        ///            'posY'            : 0,
        ///            'vY'              : 0,
        ///            'time'            : this.timer.tmpTime,
        ///            'tmpres'          : 10,
        ///            'jump'            : 5,
        ///            'last_jump_time'  : null, };
        this.ch = {
            'gravity'   : -6,
            'jump_stack': [],
            'jumpAY'    : 500, // m/s/s
            'jumpAT'    : 10,  // ms
            'prev_time' : null,
            'started'   : false,
            'speedY'    : 0,
            'posY'      : 0,
        };
    }

    exit() {
        this.controller.deactivate();
    }
    
    render() {

        ////////////////////////////////////////////////////////////////////////
        { // コントローラーの受け取り
            

            let ups = []; // 前フレーム以降に押されたジャンプボタンの履歴
            for(let key in this.ctrlHist){ // このシーンで受け付ける種類のキーについて処理していく
                if(this.controller.KeyBoard[key].length===0) continue; // キーが押されていないなら処理の必要なし
                for(let i=this.controller.KeyBoard[key].length-1;i>=0;i--){ // 最新のキー入力から処理していく
                    const id = this.controller.KeyBoard[key][i].start;        // そのキー入力固有のIDを作成
                    if(id in this.ctrlHist[key]) break; // このシーンでもう処理済みのキー入力なら無視
                    ////if(id > now_ms) break; // 入力のほうが先行していたらやめる
                    this.ctrlHist[key][id] = 'done'; // このシーンでもう処理したキー入力として記憶
                    if(key===' ') ups.push( this.controller.KeyBoard[key][i].start );
                }
            }

            // ジャンプ操作集計
            if(ups.length!==0){
                if(!this.ch.started){ // キャラクター操作が開始されていなかったら
                    this.ch.started = true; // キャラクター操作を開始
                    this.ch.prev_time = ups[0]; // 最後に計算した時刻を
                }
                this.ch.jump_stack = this.ch.jump_stack.concat(ups);
            }

            // 変位計算
            if(this.ch.started){
                const now_ms = this.timer.tmpTime;    
                const msec = now_ms-this.ch.prev_time;
                // 加速度をリストアップ
                const accel = new Float64Array( msec );
                for(let i=0,j=this.ch.prev_time;i<msec;i++,j++){
                    accel[i] = this.ch.gravity;
                    for(let k=0;k<this.ch.jump_stack.length;k++){
                        const jump = this.ch.jump_stack[k];
                        if( jump<=j && j<jump+this.ch.jumpAT ){
                            console.log('hoge', this.ch.jumpAY);
                            accel[i] += this.ch.jumpAY;
                        }
                    }
                }

                // いらなくなったジャンプを消す
                let delcount = 0;
                for(let k=0;k<this.ch.jump_stack.length;k++){
                    if(this.ch.jump_stack[k]+this.ch.jumpAT<=now_ms) delcount++;
                }
                this.ch.jump_stack.splice(0,delcount);

                // 速度、位置の計算
                const speed = new Float64Array( msec );
                speed[0] = this.ch.speedY + accel[0]*0.001;
                const posiY = new Float64Array( msec );
                posiY[0] = this.ch.posY + speed[0]*0.001;
                for(let i=1;i<msec;i++){
                    speed[i] = speed[i-1]+accel[i]*0.001;
                    posiY[i] = posiY[i-1]+speed[i]*0.001;
                }

                this.ch.posY   = posiY[msec-1];
                this.ch.speedY = speed[msec-1];
                this.ch.prev_time = now_ms;
            }
        }

        // ステージの更新
        this.level.update();

        ////////////////////////////////////////////////////////////////////////

        { // 描画範囲の座標限界を設定
            [this.Xlim,this.Ylim,this.sXlim,this.sYlim] = this.offScreen.getXYlims();
            const [u,v] = [this.offScreen.canvas.width, this.offScreen.canvas.height];
            const resPtr = this.gl.getUniformLocation(this.program, 'resolution');
            this.gl.uniform2fv(resPtr, [u,v]);
            const XYlimPtr = this.gl.getUniformLocation(this.program, 'XYlim');
            this.gl.uniform2fv(XYlimPtr, [this.Xlim,this.Ylim]);
            const XYlim2Ptr = this.gl.getUniformLocation(this.program, 'XYlim2');
            this.gl.uniform2fv(XYlim2Ptr, [this.Xlim,this.Ylim]);
            const sXYlimPtr = this.gl.getUniformLocation(this.program, 'sXYlim');
            this.gl.uniform2fv(sXYlimPtr, [this.sXlim,this.sYlim]);
        }

        // 描画処理
        this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);

        // 世界
        {   // 場所と姿勢のパラメータのみ書き換える
            const quat = QU.gen( [0,1,0], 0 );
            const scale = [ 1,1,1 ];
            const shift = [ 0,0,0 ];
        
            GLUtil.changeVAOsVariable(this.gl, this.program, this.worldVAO, 'quat',  GLUtil.createVBO(this.gl, quat ), /*stride*/ 4);
            GLUtil.changeVAOsVariable(this.gl, this.program, this.worldVAO, 'scale', GLUtil.createVBO(this.gl, scale), /*stride*/ 3);
            GLUtil.changeVAOsVariable(this.gl, this.program, this.worldVAO, 'shift', GLUtil.createVBO(this.gl, shift), /*stride*/ 3);

            GLUtil.sendVAO(this.gl, this.worldVAO);
            this.gl.uniform1i(this.bgPtr, 1);
            this.gl.drawElementsInstanced(this.gl.TRIANGLES, this.world_length, this.gl.UNSIGNED_SHORT,
                                          /*start*/0, /*#-obj*/ 1);
        }

        // ラミエル
        {   // 場所と姿勢を決める
            const ang_rad = ((this.timer.tmpTime*0.2)/360%1)*(2*Math.PI);
            const pos_rad = ((this.timer.tmpTime*0.1)/360%1)*(2*Math.PI);
        
            const rotV = [0,1,0];
            const [ang0,ang1] = [ ang_rad, ang_rad+0.5*Math.PI ];
        
            const quat  = [ rotV[0]*Math.sin(ang0/2.0), rotV[1]*Math.sin(ang0/2.0), rotV[2]*Math.sin(ang0/2.0), Math.cos(ang0/2.0),
                            rotV[0]*Math.sin(ang1/2.0), rotV[1]*Math.sin(ang1/2.0), rotV[2]*Math.sin(ang1/2.0), Math.cos(ang1/2.0),
                            rotV[0]*Math.sin(ang1/2.0), rotV[1]*Math.sin(ang1/2.0), rotV[2]*Math.sin(ang1/2.0), Math.cos(ang1/2.0)];
            const scale = [ 0.2,0.2,0.2,  0.2,0.2,0.2,  1,1,1 ];
            const shift = [ 2*Math.cos(pos_rad),             0, 2*Math.sin(pos_rad),
                            3*Math.cos(pos_rad+0.5*Math.PI), 0, 3*Math.sin(pos_rad+0.5*Math.PI),
                            0, this.ch.posY, 0 ];
        
            // 場所と姿勢のパラメータのみ書き換える
            GLUtil.changeVAOsVariable(this.gl, this.program, this.ramielVAO, 'quat',  GLUtil.createVBO(this.gl, quat ), /*stride*/ 4);
            GLUtil.changeVAOsVariable(this.gl, this.program, this.ramielVAO, 'scale', GLUtil.createVBO(this.gl, scale), /*stride*/ 3);
            GLUtil.changeVAOsVariable(this.gl, this.program, this.ramielVAO, 'shift', GLUtil.createVBO(this.gl, shift), /*stride*/ 3);
        
            GLUtil.sendVAO(this.gl, this.ramielVAO);
            this.gl.uniform1i(this.bgPtr, 0);
            this.gl.drawElementsInstanced(this.gl.TRIANGLES, this.ramiel_length, this.gl.UNSIGNED_SHORT,
                                          /*start*/0, /*#-obj*/ 3);
        }

        // 土管
        let collider = null;
        {   // 場所と姿勢のパラメータのみ書き換える
            /// const quat0 = QU.gen( [0,1,0], this.timer.tmpTime*0.2 );
            /// const quat1 = QU.gen( [1,0,0], this.timer.tmpTime*0.1 );
            /// const quat = QU.mul( quat0, quat1  );
            /// //const quat = QU.gen( [1,0,0], 80 );
            /// const scale = [ 1,1,1 ];
            /// const shift = [ 0,0,0 ];
            /// const numObj = 1;

            const [quat,scale,shift,numObj,col_] = this.level.data;
            collider = col_;

            GLUtil.changeVAOsVariable(this.gl, this.program, this.pipeVAO, 'quat',  GLUtil.createVBO(this.gl, quat ), /*stride*/ 4);
            GLUtil.changeVAOsVariable(this.gl, this.program, this.pipeVAO, 'scale', GLUtil.createVBO(this.gl, scale), /*stride*/ 3);
            GLUtil.changeVAOsVariable(this.gl, this.program, this.pipeVAO, 'shift', GLUtil.createVBO(this.gl, shift), /*stride*/ 3);
        
            GLUtil.sendVAO(this.gl, this.pipeVAO);
            this.gl.uniform1i(this.bgPtr, 0);
            this.gl.drawElementsInstanced(this.gl.TRIANGLES, this.pipe_length, this.gl.UNSIGNED_SHORT,
                                            /*start*/0, /*#-obj*/ numObj);
        }

        ////////////////////////////////////////////////////////////////////////
        // 衝突判定


        this.gl.flush();
    }

}