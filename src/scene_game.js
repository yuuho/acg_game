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
import GameOverScene from './scene_gameover.js';

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
uniform float objectAlpha;
uniform float utime;

out vec4 color_out;

IMPORT_GLSLSNIPPET

vec4 shading(vec3 vcolor, vec3 wpos, vec3 nvec, vec3 vvec){
    return vec4(vcolor*0.5, 1.0)
                    + vec4( ambientShadeD(     wpos, nvec ), 1.0)
                    + vec4( directionalShadeD( wpos, nvec ), 1.0)
                    + vec4( pointShadeD(       wpos, nvec ), 1.0);
}

float rand(float n){return fract(sin(n) * 43758.5453123);}
vec4 space_background(){
    float a = 200.0;

    float d = distance(vec3(0.0, 0.0,a),wpos)/(sqrt(6.0)*a);
    int n = 10;
    int m = 900;
    float pi = 3.14159265358979;
    float d2 = floor( (atan(wpos.x/wpos.y)+pi*step(0.0,wpos.x)+0.5*pi)/(2.0*pi) *float(m))/float(m) ;
    return vec4(
            //vec3( pow( fract( d+d2-utime/50000.0 + rand(d2) ), 100.0 ) ),
            vec3( exp( ( fract( d+d2-utime/50000.0 + rand(d2) )-1.0 )/0.001 ) ),
            1.0);
}

void main() {
    vec4 color;
    if(isBackground>0){
        //color = vec4(vec3(0.0),1.0);
        color = space_background();
    }else{
        color = shading( colo, wpos, nvec, vvec );
    }
    color = vec4( clamp(color.x,0.0,1.0),
                  clamp(color.y,0.0,1.0),
                  clamp(color.z,0.0,1.0),
                  objectAlpha );
                  ///clamp(color.w,0.0,1.0) );

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


// 3Dオブジェクト
class Renderable{

    constructor( timer ) {
        this.timer = timer;
        this.model_initialize();
    }

    // モデルなどの初期化
    model_initialize() {
        throw Error('Not Implemented Error.');
    }

    // レンダリングの呼び出し
    render(gl, program, VAOs) {
        throw Error('Not Implemented Error');
    }
    createVAOs(gl, program) {
        throw Error('Not Implemented Error');
    }
}


// ステージ
class Level extends Renderable {

    constructor(timer, radius, character_size) {
        super(timer);

        // 土管クラス
        this.PipeObjClass = class {
            constructor(gentime, direction, posY) {
                this.gentime = gentime; // ms
                this.direction = direction; // +1 or -1
                this.quat = QU.gen( [1,0,0], direction>0 ? 0 : 180 );
                this.posY = posY;
            }
        };

        this.characterZmax =  character_size; // とりあえず。キャラクターがいそうな領域の z最大値
        this.characterZmin = -character_size; // とりあえず。キャラクターがいそうな領域の z最小値

        this.timer = timer;
        this.stat_time = this.timer.tmpTime;
        this.radius = radius;

        this.freq = 1500;   // 土管生成の周期 [ms]
        this.inf = 1000;    // 無限
        this.Zspeed = -3;   // 土管の移動速度 [m/s]
        this.Zstart = 50;   // 土管が生成される位置
        this.Zend = -2;    // 土管が消去される位置
        this.Zinit = 10;    // ゲーム開始時に一番近い土管の位置
        this.difficulty = 2;// 通り道の最難移動幅

        // 初期化
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

        // 存在する土管のリスト
        this.pipestack = [];
        // ゲーム開始時に存在しているべき土管の生成
        this.pre_generate();
    }

    /// Renderable methods
    model_initialize() {
        this.model = new Pipe();
        this.vaoTemplate = [
            [this.model.vertices, this.model.colors, this.model.normals, [],     [],      []      ],
            ['pos',               'coli',            'normal',           'quat', 'scale', 'shift' ],
            [null,                null,              null,               1,      1,       1,      ],
            [this.model.vdim,     this.model.cdim,   this.model.ndim,    4,      3,       3,      ],
            this.model.indices
        ];
    }
    createVAOs(gl,program) {
        return GLUtil.createVAO(gl, program, ...this.vaoTemplate);
    }
    render(gl, program, VAO) {
        // 場所と姿勢のパラメータのみ書き換える
        /// const quat0 = QU.gen( [0,1,0], this.timer.tmpTime*0.2 );
        /// const quat1 = QU.gen( [1,0,0], this.timer.tmpTime*0.1 );
        /// const quat = QU.mul( quat0, quat1  );
        /// //const quat = QU.gen( [1,0,0], 80 );
        /// const scale = [ 1,1,1 ];
        /// const shift = [ 0,0,0 ];
        /// const numObj = 1;

        const [quat,scale,shift,numObj] = this.data;

        GLUtil.changeVAOsVariable( gl, program, VAO, 'quat',  GLUtil.createVBO(gl, quat ), /*stride*/ 4);
        GLUtil.changeVAOsVariable( gl, program, VAO, 'scale', GLUtil.createVBO(gl, scale), /*stride*/ 3);
        GLUtil.changeVAOsVariable( gl, program, VAO, 'shift', GLUtil.createVBO(gl, shift), /*stride*/ 3);
    
        GLUtil.sendVAO(gl, VAO);
        gl.uniform1i( gl.getUniformLocation(program, 'isBackground'), 0); // とりあえず
        gl.uniform1f( gl.getUniformLocation( program, 'objectAlpha'), 1.0 );
        gl.drawElementsInstanced(gl.TRIANGLES, this.model.length, gl.UNSIGNED_SHORT, /*start*/0, /*#-obj*/ numObj);
    }

    /// level methods

    // ゲーム開始からの時刻
    now_ms() {
        return this.timer.tmpTime-this.stat_time;
    }

    // (毎フレーム実行)
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
        // 土管のパラメータをリストアップ、範囲外に出た土管を消す
        this.calc_and_delete();
    }

    // 土管のパラメータをリストアップ、範囲外に出た土管をけす
    calc_and_delete() {
        const time_ms = this.now_ms();
        this.quats  = [];
        this.scales = [];
        this.shifts = [];
        let deleteCount = 0;
        this.collider = [[-this.inf, this.inf, -this.inf, this.dead_lower_limit, -this.inf, this.inf ],  // floor
                         [-this.inf, this.inf,  this.dead_upper_limit, this.inf, -this.inf, this.inf ]]; // ceil

        for(let i=0;i<this.pipestack.length;i++){
            const pipe = this.pipestack[i];
            const t = (time_ms-pipe.gentime)/1000;
            const z = this.Zstart + this.Zspeed*t;
            if(z<this.Zend){
                deleteCount++;
                continue;
            }
            // 衝突判定しなければいけないもの
            if( ( z<(this.characterZmax+this.radius) ) && ( z>(this.characterZmin-this.radius) ) ){
                if(pipe.direction>0){
                    this.collider.push([ -this.radius, this.radius, -this.inf, pipe.posY, z-this.radius, z+this.radius ]);
                }else{
                    this.collider.push([ -this.radius, this.radius, pipe.posY, this.inf, z-this.radius, z+this.radius ]);
                }
            }
            this.quats  = this.quats.concat(pipe.quat);
            this.scales = this.scales.concat([1,1,1]);
            this.shifts = this.shifts.concat([ 0, pipe.posY, z ]);
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
        this.collider = [];
    }

    // 確率的土管生成
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
                this.pipestack.push( new this.PipeObjClass( timing_ms, -1, topY    ) );
                break;
            case 2: // 下にだけ土管生成
                this.prev_upper_limit = upper_limit;
                this.prev_lower_limit = bottomY;
                this.steps_from_lastgen = 0;
                this.pipestack.push( new this.PipeObjClass( timing_ms,  1, bottomY ) );
                break;
            case 3: // 上下に土管生成
                this.prev_upper_limit = topY;
                this.prev_lower_limit = bottomY;
                this.steps_from_lastgen = 0;
                this.pipestack.push( new this.PipeObjClass( timing_ms, -1, topY    ) );
                this.pipestack.push( new this.PipeObjClass( timing_ms,  1, bottomY ) );
                break;
            default:
                console.log('error generate status');
        }
    }

    // 土管の位置確認、生存制御
    get data() {
        return [ this.quats, this.scales, this.shifts, this.pipestack.length ];
    }
}


// 背景
class Background extends Renderable{
    model_initialize() {
        // モデル
        this.model = new Universe();
        this.vaoTemplate = [
            [this.model.vertices, this.model.colors, this.model.normals, [],     [],      []      ],
            ['pos',               'coli',            'normal',           'quat', 'scale', 'shift' ],
            [null,                null,              null,               1,      1,       1,      ],
            [this.model.vdim,     this.model.cdim,   this.model.ndim,    4,      3,       3,      ],
            this.model.indices
        ];
    }
    createVAOs(gl,program) {
        return GLUtil.createVAO( gl, program, ...this.vaoTemplate );
    }
    render(gl,program,VAOs) {
        const quat = QU.gen( [0,1,0], 0 );
        const scale = [ 1,1,1 ];
        const shift = [ 0,0,0 ];
    
        GLUtil.changeVAOsVariable(gl, program, VAOs, 'quat',  GLUtil.createVBO(gl, quat ), /*stride*/ 4);
        GLUtil.changeVAOsVariable(gl, program, VAOs, 'scale', GLUtil.createVBO(gl, scale), /*stride*/ 3);
        GLUtil.changeVAOsVariable(gl, program, VAOs, 'shift', GLUtil.createVBO(gl, shift), /*stride*/ 3);

        GLUtil.sendVAO(gl, VAOs );
        gl.uniform1i( gl.getUniformLocation(program, 'isBackground'), 1); // とりあえず
        gl.uniform1f( gl.getUniformLocation( program, 'objectAlpha'), 1.0 );
        gl.drawElementsInstanced(gl.TRIANGLES, this.model.length, gl.UNSIGNED_SHORT, /*start*/0, /*#-obj*/ 1);
    }
}


// 操作可能キャラクター
class Character extends Renderable{
    constructor( timer, character_size ) {
        super( timer );
        this.character_size = character_size;
        this.character_initialize();
    }

    // キャラクターのジャンプなどのパラメータを設定
    character_initialize() {
    }

    // ジャンプキー入力
    jump( ups ) {
    }

    // 衝突判定
    collision_judge( collider ) {
        return false;
    }

    // ストックが減る
    decrement_stocks(num) {
    }

    get position() {
        return [0,0,0];
    }

    // 死んでいるかどうか確認
    get isDead() {
        return false;
    }
}


// ラミエル
class RamielCharacter extends Character{
    /// Renderable methods

    // モデル初期化
    model_initialize() {
        // モデル
        const colors = [...Array(8)].map(()=>[0,0.8,1.0]);
        // const colors = [[1,0,0],[0,1,0],[0,0,1],[0,1,1],[1,0,1],[1,1,0],[0,0,0],[0.7,0.7,0.7]]; // debug
        this.model = new Ramiel( colors );
        this.vaoTemplate = [
            [this.model.vertices, this.model.colors, this.model.normals, [],     [],      []      ],
            ['pos',               'coli',            'normal',           'quat', 'scale', 'shift' ],
            [null,                null,              null,               1,      1,       1,      ],
            [this.model.vdim,     this.model.cdim,   this.model.ndim,    4,      3,       3,      ],
            this.model.indices
        ];
    }
    createVAOs(gl,program) {
        return GLUtil.createVAO( gl, program, ...this.vaoTemplate );
    }
    // モデルレンダリング
    render(gl,program,VAOs) {
        const rotV = [0,1,0];
        const [posX, posY, posZ] = this.position;
    
        const isrespawn = this.timer.tmpTime<this.intangible_start+this.intangible_time;
        let quat  = [ ...QU.gen( rotV,  isrespawn? 0 : this.timer.tmpTime*0.2 )];
        let scale = [ this.character_size,this.character_size,this.character_size ];
        let shift = [ posX,posY,posZ ];


        const r = Math.min( 2*Math.PI/this.num_stock, 1/3*Math.PI );
        const t = ((this.timer.tmpTime*0.1)/360%1)*(2*Math.PI);
        const R = 2;
        for(let i=1;i<this.num_stock;i++){
            quat  = quat.concat( QU.gen(rotV, this.timer.tmpTime*0.2 ) );
            scale = scale.concat([0.2,0.2,0.2]);
            shift = shift.concat([ R*Math.cos(t+i*r), posY, R*Math.sin(t+i*r) ]);
        }

        // 場所と姿勢のパラメータのみ書き換える
        GLUtil.changeVAOsVariable(gl, program, VAOs, 'quat',  GLUtil.createVBO(gl, quat ), /*stride*/ 4);
        GLUtil.changeVAOsVariable(gl, program, VAOs, 'scale', GLUtil.createVBO(gl, scale), /*stride*/ 3);
        GLUtil.changeVAOsVariable(gl, program, VAOs, 'shift', GLUtil.createVBO(gl, shift), /*stride*/ 3);
        
        // 描画
        GLUtil.sendVAO(gl, VAOs);
        gl.uniform1i( gl.getUniformLocation( program, 'isBackground'), 0); // とりあえず
        // 無敵のときの点滅
        if(this.timer.tmpTime<this.intangible_start+this.intangible_time){
            const r = (this.timer.tmpTime-this.intangible_start)/this.intangible_freq*2*Math.PI;
            gl.uniform1f( gl.getUniformLocation( program, 'objectAlpha'), Math.cos(r) );
        }else{
            gl.uniform1f( gl.getUniformLocation( program, 'objectAlpha'), 1.0 );
        }
        gl.drawElementsInstanced( gl.TRIANGLES, this.model.length, gl.UNSIGNED_SHORT, /*start*/0, /*#-obj*/ this.num_stock);
    }

    /// Character methods

    character_initialize() {
        this.gravity    = -6;
        // this.jumpAY     = 500; // m/s/s
        // this.jumpAT     = 10;  // ms
        this.jumpAY     = 1000; // m/s/s
        this.jumpAT     = 5;  // ms

        this.num_stock  = 3;
        this.collider_size = this.character_size*0.7;

        // spawn time initialization
        this.jump_stack = [];
        this.prev_time  = null;
        this.started    = false;
        this.speedY     = 0;
        this.posY       = 0;

        this.intangible_freq  = 700;
        this.intangible_start = -999999;
        this.intangible_time  = 3000;
    }

    // ジャンプなど
    jump( ups ){
        // ジャンプ操作集計
        if(ups.length!==0){
            if(!this.started){ // キャラクター操作が開始されていなかったら
                this.started = true; // キャラクター操作を開始
                this.prev_time = ups[0].start; // 最後に計算した時刻を
                ups = [];// 一番最初はジャンプしない
            }
            this.jump_stack = this.jump_stack.concat(ups);
        }

        // キャラクター位置の計算
        if(this.started){
            const now_ms = this.timer.tmpTime;
            const msec = now_ms-this.prev_time;
            // 加速度をリストアップ
            const accel = new Float64Array( msec );
            for(let i=0,j=this.prev_time;i<msec;i++,j++){
                accel[i] = this.gravity;
                for(let k=0;k<this.jump_stack.length;k++){
                    const jump = this.jump_stack[k].start;
                    if( jump<=j && j<jump+this.jumpAT ){
                        accel[i] += this.jumpAY;
                    }
                }
            }

            // いらなくなったジャンプを消す
            let delcount = 0;
            for(let k=0;k<this.jump_stack.length;k++){
                if(this.jump_stack[k].start+this.jumpAT<=now_ms) delcount++;
            }
            this.jump_stack.splice(0,delcount);

            // 速度、位置の計算
            const speed = new Float64Array( msec );
            speed[0] = this.speedY + accel[0]*0.001;
            const posiY = new Float64Array( msec );
            posiY[0] = this.posY + speed[0]*0.001;
            for(let i=1;i<msec;i++){
                speed[i] = speed[i-1]+accel[i]*0.001;
                posiY[i] = posiY[i-1]+speed[i]*0.001;
            }

            this.posY   = posiY[msec-1];
            this.speedY = speed[msec-1];
            this.prev_time = now_ms;
        }
    }

    // 衝突判定
    collision_judge( box_collider ) {
        const collideIDs = [...Array(box_collider.length)].map(()=>false);
        const [x,y,z] = this.position;
        const c = this.collider_size;
        const [Xmin,Xmax,Ymin,Ymax,Zmin,Zmax] = [x-c,x+c,y-c,y+c,z-c,z+c];
        for(let i=0;i<box_collider.length;i++){
            const [xmin,xmax,ymin,ymax,zmin,zmax] = box_collider[i];
            if(    ( (!(Xmax<xmin)) && (!(xmax<Xmin)) )
                && ( (!(Ymax<ymin)) && (!(ymax<Ymin)) )
                && ( (!(Zmax<zmin)) && (!(zmax<Zmin)) ) ){
                collideIDs[i] = true;
            }
        }
        return collideIDs;
    }

    is_colliding( box_collider ) {
        const collision_judges = this.collision_judge(box_collider);
        return collision_judges.filter(v=>v).length>0;
    }

    debug_collider(gl,program, box_collider ) {
        const collideIDs = this.collision_judge( box_collider );

        if(box_collider.length>2 || collideIDs.filter(v=>v).length>0){
            ((bc,c)=>(gl,prg,Y,IDs)=>{
                const inf = 100;
                let idx = 0;
                let vpos = [];
                let norm = [];
                let color = [];
                let indice = [];
                for(let i=0;i<bc.length;i++){
                    const [x0,x1,y0,y1,z0,z1] = bc[i].map( v=>( (v<-inf)? -inf : (v>inf? inf : v) ) );
                    vpos = vpos.concat([ x0,y1,z0, x0,y1,z1, x1,y1,z1, x1,y1,z0,
                                         x0,y0,z0, x0,y0,z1, x1,y0,z1, x1,y0,z0, ]);
                    norm = norm.concat([ 1,0,0, 1,0,0, 1,0,0, 1,0,0,
                                         1,0,0, 1,0,0, 1,0,0, 1,0,0, ]);
                    if(IDs[i]){
                        color = color.concat([ 2,0,0, 2,0,0, 2,0,0, 2,0,0,
                                               2,0,0, 2,0,0, 2,0,0, 2,0,0, ]);
                    }else{
                        if(i<2){
                            color = color.concat([ 0,0,2, 0,0,2, 0,0,2, 0,0,2,
                                                   0,0,2, 0,0,2, 0,0,2, 0,0,2, ]);
                        }else{
                            color = color.concat([ 2,2,2, 2,2,2, 2,2,2, 2,2,2,
                                                   2,2,2, 2,2,2, 2,2,2, 2,2,2, ]);
                        }
                    }
                    indice = indice.concat([ 0,3,1, 1,3,2, 4,7,0, 7,3,0,
                                             7,6,3, 6,2,3, 5,7,4, 5,6,7,
                                             1,2,5, 2,6,5, 0,1,5, 0,5,4 ].map(v=>v+idx) );
                    idx += 8;
                }
                {
                    const [x0,x1,y0,y1,z0,z1] = [-c,c,Y-c,Y+c,-c,c];
                    vpos = vpos.concat([ x0,y1,z0, x0,y1,z1, x1,y1,z1, x1,y1,z0,
                                         x0,y0,z0, x0,y0,z1, x1,y0,z1, x1,y0,z0, ]);
                    norm = norm.concat([ 1,0,0, 1,0,0, 1,0,0, 1,0,0,
                                         1,0,0, 1,0,0, 1,0,0, 1,0,0, ]);
                    if(IDs.filter(v=>v).length>0){
                        color = color.concat([ 2,0,0, 2,0,0, 2,0,0, 2,0,0,
                                               2,0,0, 2,0,0, 2,0,0, 2,0,0, ]);
                    }else{
                        color = color.concat([ 2,2,2, 2,2,2, 2,2,2, 2,2,2,
                                               2,2,2, 2,2,2, 2,2,2, 2,2,2, ]);
                    }
                    indice = indice.concat([ 0,3,1, 1,3,2, 4,7,0, 7,3,0,
                                            7,6,3, 6,2,3, 5,7,4, 5,6,7,
                                            1,2,5, 2,6,5, 0,1,5, 0,5,4 ].map(v=>v+idx) );
                    idx += 8;
                }
                const VAO = GLUtil.createVAO(gl,prg,
                                [vpos,  color,  norm,     QU.gen([0,1,0],0), [1,1,1], [0,0,0] ],
                                ['pos', 'coli', 'normal', 'quat',    'scale', 'shift' ],
                                [null,  null,   null,     1,         1,       1,      ],
                                [3,     3,      3,        4,         3,       3,      ],
                                indice );
                GLUtil.sendVAO(gl,VAO);
                gl.drawElementsInstanced( gl.TRIANGLES, indice.length, gl.UNSIGNED_SHORT, /*start*/0, /*#-obj*/ 1);
            })(box_collider,this.collider_size)(gl,program,this.position[1],collideIDs);
        }
    }

    decrement_stocks(num) {
        if(this.timer.tmpTime>this.intangible_start+this.intangible_time){
            this.num_stock -= num;
            // TODO : respawn
            this.jump_stack = [];
            this.prev_time  = null;
            this.started    = false;
            this.speedY     = 0;
            this.posY       = 0;

            this.intangible_start = this.timer.tmpTime;
        }
    }

    get position() {
        return [0, this.posY, 0];
    }

    get isDead() {
        return this.num_stock<=0;
    }
}


// シーン
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

        // 土管の太さ
        const pipe_radius = 1.0;
        const character_size = 1.0;

        // キャラクター
        this.character = new RamielCharacter(this.timer, character_size);
        this.characterVAOs = this.character.createVAOs(this.gl, this.program);

        // ステージの初期化
        this.level = new Level(this.timer, pipe_radius, character_size);
        this.levelVAOs = this.level.createVAOs(this.gl, this.program);

        // 背景
        this.world = new Background(this.timer);
        this.worldVAOs = this.world.createVAOs(this.gl, this.program);
    }

    exit() {
        this.controller.deactivate();
    }
    
    render() {

        ///// ゲーム状態の更新処理

        { // コントローラーの受け取り
            const ups = []; // 前フレーム以降に押されたジャンプボタンの履歴
            for(let key in this.ctrlHist){ // このシーンで受け付ける種類のキーについて処理していく
                if(this.controller.KeyBoard[key].length===0) continue; // キーが押されていないなら処理の必要なし
                for(let i=this.controller.KeyBoard[key].length-1;i>=0;i--){ // 最新のキー入力から処理していく
                    const keyInput = this.controller.KeyBoard[key][i];
                    const id = keyInput.start;        // そのキー入力固有のIDを作成

                    // このシーンでもう終了したキー入力なら無視
                    if( (id in this.ctrlHist[key])&&( this.ctrlHist[key][id].end !== null ) ) break;
                    
                    // 開始時刻、終了時刻
                    const data = {'start': keyInput.start,
                                  'end'  : 'end' in keyInput ? keyInput.end : null };
                    this.ctrlHist[key][id] = data; // 開始したキーとして記憶

                    if(key===' ') ups.push( data );
                }
            }
            // ジャンプ処理
            this.character.jump( ups );
        } // コントローラーの受け取りここまで

        // ステージの更新
        this.level.update();

        // 当たり判定
        if( this.character.is_colliding(this.level.collider) ){
            // 当たったら残機が１減る
            this.character.decrement_stocks(1);

            // 残機 0 なら GAME OVER
            if(this.character.isDead){
                this.sceneMg.changeScene( GameOverScene.sceneName, GameOverScene );
            }
        }

        ///// 描画関係の処理

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
            // 時間の設定
            const timePtr = this.gl.getUniformLocation(this.program, 'utime');
            this.gl.uniform1f(timePtr, this.timer.tmpTime);
            
        }

        // カメラ位置と画角を設定
        {
            //const camPos = [0,2,-10];
            ///const camPos = [0,2,-10];
            const rad = ((this.timer.tmpTime*0.05)/360%1)*(2*Math.PI);
            const camPos = [3*Math.cos(rad),3*Math.sin(rad),-10];
            
            const vMat = MU.camLookAt(camPos,[0,0,0],[0,1,0]);
            
            //console.log( MU.print(vMat) );
            //console.log( MU.print(MU.camLookAt(camPos, [0,0,0], [0,1,0]) ) );

            const camPosPtr = this.gl.getUniformLocation(this.program, 'camPos');
            const vMatPtr = this.gl.getUniformLocation(this.program, 'vMat');
            this.gl.uniform3fv(camPosPtr, camPos);
            this.gl.uniformMatrix4fv(vMatPtr,  true /*=transpose*/, new Float32Array( vMat.flat() ));
            
            const pMat = MU.proj( 30, 1, 1, 1000);
            const pMatPtr = this.gl.getUniformLocation(this.program, 'pMat');
            this.gl.uniformMatrix4fv(pMatPtr,  true /*=transpose*/, new Float32Array( pMat.flat() ));
        }

        // 画面を初期化
        this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);
        // 背景の描画
        this.world.render(this.gl, this.program, this.worldVAOs);
        // キャラクターの描画
        this.character.render(this.gl, this.program, this.characterVAOs);
        // ステージの描画
        this.level.render(this.gl, this.program, this.levelVAOs);

        // 画面を更新
        this.gl.flush();
    }


    // デバッグ画面の初期化
    open_debugger(H,W) {
        this.debugScreen = new OffScreen(H,W, '2d',false,false);
        this.debugNS = {};
        const [w,h] = this.gameResolution;

        this.debugNS.disp1 = new OffScreen(h,w, 'webgl2', false, false);
        this.debugNS.gl1 = this.debugNS.disp1.context;

        this.debugNS.gl1.clearColor(0.0, 0.0, 0.0, 1.0); // 背景色 = 黒
        this.debugNS.gl1.enable(this.debugNS.gl1.CULL_FACE);
        this.debugNS.program1 = GLUtil.createProgram(this.debugNS.gl1, vshader, fshader);
        this.debugNS.gl1.useProgram(this.debugNS.program1);

        this.debugNS.disp2 = new OffScreen(h,w, 'webgl2', false, false);
        this.debugNS.gl2 = this.debugNS.disp2.context;

        this.debugNS.gl2.clearColor(0.0, 0.0, 0.0, 1.0); // 背景色 = 黒
        this.debugNS.gl2.enable(this.debugNS.gl2.CULL_FACE);
        this.debugNS.program2 = GLUtil.createProgram(this.debugNS.gl2, vshader, fshader);
        this.debugNS.gl2.useProgram(this.debugNS.program2);

        this.debugNS.initialized = false;
    }
    debug_initializer() {
        this.debugNS.world1 = this.world.createVAOs( this.debugNS.gl1, this.debugNS.program1);
        this.debugNS.level1 = this.level.createVAOs( this.debugNS.gl1, this.debugNS.program1);
        this.debugNS.chara1 = this.character.createVAOs( this.debugNS.gl1, this.debugNS.program1);

        this.debugNS.world2 = this.world.createVAOs( this.debugNS.gl2, this.debugNS.program2);
        this.debugNS.level2 = this.level.createVAOs( this.debugNS.gl2, this.debugNS.program2);
        this.debugNS.chara2 = this.character.createVAOs( this.debugNS.gl2, this.debugNS.program2);
    }
    // デバッグ画面の消去
    close_debugger() {
        this.debugScreen = null;
        this.debugNS = null;
    }
    // デバッグ画面が表示されているときに実行される関数
    debug_render() {

        if(!this.debugNS.initialized) this.debug_initializer();

        this.debugScreen.context.fillStyle = "rgb(20,100,100)";
        this.debugScreen.context.fillRect(0,0,this.debugScreen.canvas.width,
                                              this.debugScreen.canvas.height);
        
        const [cvs1,cvs2] = [this.debugNS.disp1.canvas, this.debugNS.disp2.canvas];
        const [gl1,gl2] = [this.debugNS.gl1, this.debugNS.gl2];
        const [prg1,prg2] = [this.debugNS.program1, this.debugNS.program2];

        // 処理

        {
            { // 描画範囲の座標限界を設定
                [this.Xlim,this.Ylim,this.sXlim,this.sYlim] = this.offScreen.getXYlims();
                const [u,v] = [this.offScreen.canvas.width, this.offScreen.canvas.height];
                const resPtr = gl1.getUniformLocation(prg1, 'resolution');
                gl1.uniform2fv(resPtr, [u,v]);
                const XYlimPtr = gl1.getUniformLocation(prg1, 'XYlim');
                gl1.uniform2fv(XYlimPtr, [this.Xlim,this.Ylim]);
                const XYlim2Ptr = gl1.getUniformLocation(prg1, 'XYlim2');
                gl1.uniform2fv(XYlim2Ptr, [this.Xlim,this.Ylim]);
                const sXYlimPtr = gl1.getUniformLocation(prg1, 'sXYlim');
                gl1.uniform2fv(sXYlimPtr, [this.sXlim,this.sYlim]);
                // 時間の設定
                const timePtr = gl1.getUniformLocation(prg1, 'utime');
                gl1.uniform1f(timePtr, this.timer.tmpTime);
            }

            { // カメラ位置と画角を設定
                const camPos = [7,2,-15];
                const vMat = MU.camLookAt(camPos,[0,0,0],[0,1,0]);

                const pMat = MU.proj( 30, 1, 1, 1000);
                const camPosPtr = gl1.getUniformLocation(prg1, 'camPos');
                const vMatPtr = gl1.getUniformLocation(prg1, 'vMat');
                const pMatPtr = gl1.getUniformLocation(prg1, 'pMat');
                gl1.uniform3fv(camPosPtr, camPos);
                gl1.uniformMatrix4fv(vMatPtr,  true /*=transpose*/, new Float32Array( vMat.flat() ));
                gl1.uniformMatrix4fv(pMatPtr,  true /*=transpose*/, new Float32Array( pMat.flat() ));
            }

            // 画面を初期化
            gl1.clear(gl1.COLOR_BUFFER_BIT|gl1.DEPTH_BUFFER_BIT);
            // 背景の描画
            this.world.render(gl1, prg1, this.debugNS.world1);
            // キャラクターの描画
            this.character.render(gl1, prg1, this.debugNS.chara1);
            // ステージの描画
            this.level.render(gl1, prg1, this.debugNS.level1);
            // デバッグ
            this.character.debug_collider(gl1, prg1, this.level.collider);

            {
                const inf=100; const quat = QU.gen([1,0,0],0);
                GLUtil.sendVBO(gl1,prg1, 'pos'   , GLUtil.createVBO(gl1,[inf,0,0, -inf,0,0, 0,inf,0, 0,-inf,0, 0,0,inf, 0,0,-inf]), 3);
                GLUtil.sendVBO(gl1,prg1, 'coli'  , GLUtil.createVBO(gl1,[inf,0,0,  inf,0,0, 0,inf,0, 0, inf,0, 0,0,inf, 0,0, inf]), 3);
                GLUtil.sendVBO(gl1,prg1, 'normal', GLUtil.createVBO(gl1,[0,0,0, 0,0,0,  0,0,0, 0,0,0,  0,0,0, 0,0,0]             ), 3);
                GLUtil.sendVBO(gl1,prg1, 'quat'  , GLUtil.createVBO(gl1,[...quat, ...quat, ...quat, ...quat, ...quat, ...quat]   ), 4);
                GLUtil.sendVBO(gl1,prg1, 'scale' , GLUtil.createVBO(gl1,[1,1,1, 1,1,1,  1,1,1, 1,1,1,  1,1,1, 1,1,1]             ), 3);
                GLUtil.sendVBO(gl1,prg1, 'shift' , GLUtil.createVBO(gl1,[0,0,0, 0,0,0,  0,0,0, 0,0,0,  0,0,0, 0,0,0]             ), 3);
                GLUtil.sendIBO(gl1,                GLUtil.createIBO(gl1,[0,1, 2,3, 4,5]                                          )   );
                gl1.uniform1f( gl1.getUniformLocation( prg1, 'objectAlpha'), 1.0 );
                gl1.drawElements(gl1.LINES, 6, gl1.UNSIGNED_SHORT, 0);
            }

            // 画面を更新
            gl1.flush();
        }

        {
            { // 描画範囲の座標限界を設定
                [this.Xlim,this.Ylim,this.sXlim,this.sYlim] = this.offScreen.getXYlims();
                const [u,v] = [this.offScreen.canvas.width, this.offScreen.canvas.height];
                const resPtr = gl2.getUniformLocation(prg2, 'resolution');
                gl2.uniform2fv(resPtr, [u,v]);
                const XYlimPtr = gl2.getUniformLocation(prg2, 'XYlim');
                gl2.uniform2fv(XYlimPtr, [this.Xlim,this.Ylim]);
                const XYlim2Ptr = gl2.getUniformLocation(prg2, 'XYlim2');
                gl2.uniform2fv(XYlim2Ptr, [this.Xlim,this.Ylim]);
                const sXYlimPtr = gl2.getUniformLocation(prg2, 'sXYlim');
                gl2.uniform2fv(sXYlimPtr, [this.sXlim,this.sYlim]);
                // 時間の設定
                const timePtr = gl2.getUniformLocation(prg2, 'utime');
                gl2.uniform1f(timePtr, this.timer.tmpTime);
            }

            { // カメラ位置と画角を設定
                const camPos = [-7,2,-15];
                const vMat = MU.camLookAt(camPos,[0,0,0],[0,1,0]);

                const pMat = MU.proj( 30, 1, 1, 1000);
                const camPosPtr = gl2.getUniformLocation(prg2, 'camPos');
                const vMatPtr = gl2.getUniformLocation(prg2, 'vMat');
                const pMatPtr = gl2.getUniformLocation(prg2, 'pMat');
                gl2.uniform3fv(camPosPtr, camPos);
                gl2.uniformMatrix4fv(vMatPtr,  true /*=transpose*/, new Float32Array( vMat.flat() ));
                gl2.uniformMatrix4fv(pMatPtr,  true /*=transpose*/, new Float32Array( pMat.flat() ));
            }

            // 画面を初期化
            gl2.clear(gl2.COLOR_BUFFER_BIT|gl2.DEPTH_BUFFER_BIT);
            // 背景の描画
            this.world.render(gl2, prg2, this.debugNS.world2);
            // キャラクターの描画
            this.character.render(gl2, prg2, this.debugNS.chara2);
            // ステージの描画
            this.level.render(gl2, prg2, this.debugNS.level2);
            // デバッグ
            this.character.debug_collider(gl2, prg2, this.level.collider);

            {
                const inf=100; const quat = QU.gen([1,0,0],0);
                GLUtil.sendVBO(gl2,prg2, 'pos'   , GLUtil.createVBO(gl2,[inf,0,0, -inf,0,0, 0,inf,0, 0,-inf,0, 0,0,inf, 0,0,-inf]), 3);
                GLUtil.sendVBO(gl2,prg2, 'coli'  , GLUtil.createVBO(gl2,[inf,0,0,  inf,0,0, 0,inf,0, 0, inf,0, 0,0,inf, 0,0, inf]), 3);
                GLUtil.sendVBO(gl2,prg2, 'normal', GLUtil.createVBO(gl2,[0,0,0, 0,0,0,  0,0,0, 0,0,0,  0,0,0, 0,0,0]             ), 3);
                GLUtil.sendVBO(gl2,prg2, 'quat'  , GLUtil.createVBO(gl2,[...quat, ...quat, ...quat, ...quat, ...quat, ...quat]   ), 4);
                GLUtil.sendVBO(gl2,prg2, 'scale' , GLUtil.createVBO(gl2,[1,1,1, 1,1,1,  1,1,1, 1,1,1,  1,1,1, 1,1,1]             ), 3);
                GLUtil.sendVBO(gl2,prg2, 'shift' , GLUtil.createVBO(gl2,[0,0,0, 0,0,0,  0,0,0, 0,0,0,  0,0,0, 0,0,0]             ), 3);
                GLUtil.sendIBO(gl2,                GLUtil.createIBO(gl2,[0,1, 2,3, 4,5]                                          )   );
                gl2.uniform1f( gl2.getUniformLocation( prg2, 'objectAlpha'), 1.0 );
                gl2.drawElements(gl2.LINES, 6, gl2.UNSIGNED_SHORT, 0);
            }
            // 画面を更新
            gl2.flush();
        }


        const [H,W] = [Math.floor(this.debugScreen.canvas.height*0.5), this.debugScreen.canvas.width];
        this.debugScreen.context.drawImage( cvs1, Math.floor(W*0.03), Math.floor(H*0.03),
                                                  Math.floor(W*0.94), Math.floor(H*0.94),  );

        this.debugScreen.context.drawImage( cvs2, Math.floor(W*0.03), Math.floor(H*1.03),
                                                  Math.floor(W*0.94), Math.floor(H*0.94),  );
    }

}