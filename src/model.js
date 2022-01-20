'use strict';

// モデル
class Ramiel{
    constructor( colors ) {
        // colors : colors for each plane

        // setting
        //  [T]op, [N]orth, [E]ast, [W]est, [S]outh, [B]ottom
        const vpos = [/*0 T*/ [ 0, 1, 0], /*1 S*/ [ 0, 0,-1], /*2 E*/ [ 1, 0, 0],
                      /*3 N*/ [ 0, 0, 1], /*4 W*/ [-1, 0, 0], /*5 B*/ [ 0,-1, 0],];
        const idxCW = [/*0 TSE*/ [0,2,1], /*1 TNE*/ [0,3,2], /*2 TNW*/ [0,4,3], /*3 TSW*/ [0,1,4],
                       /*4 BSE*/ [5,1,2], /*5 BNE*/ [5,2,3], /*6 BNW*/ [5,3,4], /*7 BSW*/ [5,4,1],];

        this.vertices = []; this.vdim = 3;
        this.normals  = []; this.ndim = 3;
        this.colors   = []; this.cdim = 3;
        this.indices  = [];
        for(let i=0,j=0;i<idxCW.length;i++) {
            // 位置
            const [p0,p2,p1] = idxCW[i].map(k=>vpos[k]); // <- now CCW. If CW, init as [p0,p1,p2]
            this.vertices = this.vertices.concat( p0, p1, p2 );
            // 色
            const c = colors[i];
            this.colors   = this.colors.concat( c, c, c );
            // 法線
            const n = [ p0[0]+p1[0]+p2[0], p0[1]+p1[1]+p2[1], p0[2]+p1[2]+p2[2] ];
            const len = Math.max( Math.sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]), 0.000001 );
            const nv = [ n[0]/len, n[1]/len, n[2]/len ];
            this.normals = this.normals.concat( nv, nv, nv );
            // インデックス
            this.indices  = this.indices.concat( [ j+0, j+1, j+2 ] );
            j += 3;
        }
    }

    get length() {
        return this.indices.length;
    }
}


// 土管の頭
class PipeHead {
    constructor( outerR, innerR, height, numDiv, color ) {

        const rads = [...Array(numDiv)].map((_,i)=>i/numDiv*2*Math.PI);
        const sins = rads.map(v=>Math.sin(v));
        const coss = rads.map(v=>Math.cos(v));

        // 最初にすべての頂点の個数を計算しておく (各座標に対して 上下方向、内外方向の2つの頂点を作る)
        const numVertices = numDiv*4*2;

        this.vertices = []; this.vdim = 3;
        this.normals  = []; this.ndim = 3;
        this.colors   = []; this.cdim = 3;
        this.indices  = [];

        const vpos = i=>[ /*0 TI*/ [ innerR*coss[i],      0, innerR*sins[i] ],
                          /*1 TO*/ [ outerR*coss[i],      0, outerR*sins[i] ],
                          /*2 BO*/ [ outerR*coss[i],-height, outerR*sins[i] ],
                          /*3 BI*/ [ innerR*coss[i],-height, innerR*sins[i] ], ];
        const nvec = i=>[ /*0 up  */ [       0,    1,       0],
                          /*1 in  */ [-coss[i],    0,-sins[i]],
                          /*2 out */ [ coss[i],    0, sins[i]],
                          /*3 down*/ [       0,   -1,       0], ];

        for(let i=0;i<numDiv;i++){
            // 頂点を追加しておく (ドーナツ切断面四角形の4頂点を法線方向別に8点追加)
            const p = vpos(i);
            const n = nvec(i);
            const c = color;
            // const c = [0.1, 0.1+0.9*i/numDiv, 0.1]; // debug

            this.vertices = this.vertices.concat( ...p, ...p ); // 4 vertex for UpDown and InOut
            this.normals  = this.normals.concat( n[0],n[0], n[3],n[3],   // up,up, down,down
                                                 n[1],n[2], n[2],n[1] ); // in,out, out,in
            this.colors   = this.colors.concat( c,c,c,c, c,c,c,c );

            // 追加した切断面 と 右隣の切断面の接続
            const [T,O,B,W] = [/*T*/[8,7,15,16],/*O*/[3,2,10,11],/*B*/[6,5,13,14],/*I*/[1,4,12,9]];
            const edge_case = x=> x<0 ? numVertices+x : x ;
            // CCW [0,3,1, 2,1,3], CW [0,1,3, 2,3,1]
            const order = [0,3,1, 2,1,3];
            this.indices = this.indices.concat( order.map( id=>edge_case((i+1)*8-T[id]) ),
                                                order.map( id=>edge_case((i+1)*8-O[id]) ),
                                                order.map( id=>edge_case((i+1)*8-B[id]) ),
                                                order.map( id=>edge_case((i+1)*8-W[id]) ), );
        }
    }

    get length() {
        return this.indices.length;
    }
}


class PipeBody {
    constructor( outerR, innerR, height, numDiv, color, headH ) {
        const decay = 1.2;
        const dark = 0.8;
        const extension = 3.0;
        
        const rads = [...Array(numDiv)].map((_,i)=>i/numDiv*2*Math.PI);
        const sins = rads.map(v=>Math.sin(v));
        const coss = rads.map(v=>Math.cos(v));

        let ys = [];
        for(let i=0;true;i++){
            const v = Math.pow(i, decay)*(outerR-innerR)*extension+headH;
            ys.push( v>height? -height : -v );
            if(v>height) break;
        }
        const numH = ys.length;
        const nvecs = [...Array(numH)].map((_,i)=>Math.pow(dark,i));

        const total_vertices = numH*numDiv*2;
        const total_triangles = (numH-1)*numDiv*2*2; // 裏表、上下

        this.vdim = 3; this.vertices = new Float32Array(total_vertices*this.vdim);
        this.ndim = 3; this.normals  = new Float32Array(total_vertices*this.ndim);
        this.cdim = 3; this.colors   = new Float32Array(total_vertices*this.cdim);
        this.indices = new Float32Array(total_triangles*3);

        const Sv = total_vertices/2*3; // 内側頂点から外側頂点への配列インデックス変換
        const Si = total_vertices/2; // 内側頂点から外側頂点への頂点ID変換

        // 三角形生成
        // [I]nner, [O]uter, lb:左下三角形, rt:右上三角形
        const mode = 'CCW';
        const Ilb = {'CW': (t,l,m,r,b)=>[m,b,l], 'CCW': (t,l,m,r,b)=>[m,l,b] }[mode];
        const Irt = {'CW': (t,l,m,r,b)=>[m,t,r], 'CCW': (t,l,m,r,b)=>[m,r,t] }[mode];
        const Olb = {'CW': (t,l,m,r,b)=>[m,l,b], 'CCW': (t,l,m,r,b)=>[m,b,l] }[mode];
        const Ort = {'CW': (t,l,m,r,b)=>[m,r,t], 'CCW': (t,l,m,r,b)=>[m,t,r] }[mode];
        
        // 注目点とその周辺の頂点ID (内・外の両方作る)
        const datagen = (i,jl,jm,jr)=>{
            const [it,im,ib] = [-1,0,+1].map( d=>((i+d)%numH+numH)%numH );
            const dataI = [            it+jm*numH,                //   ↑
                           im+jl*numH, im+jm*numH,  im+jr*numH,   // ←＋→
                                       ib+jm*numH              ]; //   ↓
            return [ dataI, dataI.map(v=>v+Si) ];
        };

        // 土管内側の面は奥に行くに従って法線ベクトルを減衰させていく(暗くなる)

        // 頂点の登録
        for(let j=0,kI=0,kO=Sv,k=0;j<numDiv;j++){
            const [jl,jm,jr] = [+1,0,-1].map( d=>((j+d)%numDiv+numDiv)%numDiv );
            {const i=0;
                // 頂点登録
                this.vertices.set([ coss[j]*innerR,  ys[i], sins[j]*innerR  ], kI);
                this.normals.set( [-coss[j]*nvecs[i],0,    -sins[j]*nvecs[i]], kI);
                this.colors.set(  color,                                       kI);
                this.vertices.set([ coss[j]*outerR,  ys[i], sins[j]*outerR  ], kO);
                this.normals.set( [ coss[j],         0,     sins[j]         ], kO);
                this.colors.set(  color,                                       kO);
                // 面登録
                const [dataI,dataO] = datagen(i,jl,jm,jr);
                this.indices.set( Ilb(...dataI), k ); k+=3;
                this.indices.set( Olb(...dataO), k ); k+=3;
            } kI+=3; kO+=3;
            for(let i=1;i<numH-1;i++,kI+=3,kO+=3){
                // 頂点登録
                this.vertices.set([ coss[j]*innerR,  ys[i], sins[j]*innerR  ], kI);
                this.normals.set( [-coss[j]*nvecs[i],0,    -sins[j]*nvecs[i]], kI);
                this.colors.set(  color,                                       kI);
                this.vertices.set([ coss[j]*outerR,  ys[i], sins[j]*outerR  ], kO);
                this.normals.set( [ coss[j],         0,     sins[j]         ], kO);
                this.colors.set(  color,                                       kO);
                // 面登録
                const [dataI,dataO] = datagen(i,jl,jm,jr);
                this.indices.set( Ilb(...dataI), k ); k+=3;
                this.indices.set( Olb(...dataO), k ); k+=3;
                this.indices.set( Irt(...dataI), k ); k+=3;
                this.indices.set( Ort(...dataO), k ); k+=3;
            }
            {const i=numH-1;
                // 頂点登録
                this.vertices.set([ coss[j]*innerR,  ys[i], sins[j]*innerR  ], kI);
                this.normals.set( [-coss[j]*nvecs[i],0,    -sins[j]*nvecs[i]], kI);
                this.colors.set(  color,                                       kI);
                this.vertices.set([ coss[j]*outerR,  ys[i], sins[j]*outerR  ], kO);
                this.normals.set( [ coss[j],         0,     sins[j]         ], kO);
                this.colors.set(  color,                                       kO);
                // 面登録
                const [dataI,dataO] = datagen(i,jl,jm,jr);
                this.indices.set( Irt(...dataI), k ); k+=3;
                this.indices.set( Ort(...dataO), k ); k+=3;
            } kI+=3; kO+=3;
        }
    }

    get length() {
        return this.indices.length;
    }
}

class Pipe {
    constructor( radius=1.0 ) {

        const outerRh     = radius;
        const outerRb     = radius*0.8;
        const innerR      = radius*0.7;
        const head_length = radius*0.4;
        const body_length = 10.0;
        const numDiv      = 160;
        const color       = [0.1, 0.7, 0.1];
        this.head_length = head_length;

        this.head = new PipeHead(outerRh,innerR,head_length,numDiv,color);
        this.body = new PipeBody(outerRb,innerR,body_length,numDiv,color,head_length);

        const IDshift = Math.floor(this.head.vertices.length/this.head.vdim);

        this.vertices = []; this.vdim = 3;
        this.normals  = []; this.ndim = 3;
        this.colors   = []; this.cdim = 3;
        this.indices  = [];

        this.vertices = this.vertices.concat(this.head.vertices);
        this.normals  = this.normals.concat( this.head.normals );
        this.colors   = this.colors.concat(  this.head.colors  );
        this.indices  = this.indices.concat( this.head.indices );

        this.vertices = this.vertices.concat(Array.from(this.body.vertices                 ));
        this.normals  = this.normals.concat( Array.from(this.body.normals                  ));
        this.colors   = this.colors.concat(  Array.from(this.body.colors                   ));
        this.indices  = this.indices.concat( Array.from(this.body.indices.map(v=>v+IDshift)));
    }

    get length() {
        return this.indices.length;
    }
}


// 世界
class Universe{
    constructor() {
        const inf = 200;

        // setting
        //  [T]op, [N]orth, [E]ast, [W]est, [S]outh, [B]ottom
        const vpos = [/*0 TNE*/ [ 1, 1, 1], /*1 TNW*/ [-1, 1, 1],
                      /*2 TSW*/ [-1, 1,-1], /*3 TSE*/ [ 1, 1,-1],
                      /*4 BNE*/ [ 1,-1, 1], /*5 BNW*/ [-1,-1, 1],
                      /*6 BSW*/ [-1,-1,-1], /*7 BSE*/ [ 1,-1,-1],];
        const idxCW = [/* 0 T*/ [3,2,1,0], /* 1 N*/ [0,1,5,4], /* 2 E*/ [3,0,4,7],
                       /* 3 W*/ [1,2,6,5], /* 4 S*/ [2,3,7,6], /* 5 B*/ [4,5,6,7],];

        this.vertices = []; this.vdim = 3;
        this.normals  = []; this.ndim = 3;
        this.colors   = []; this.cdim = 3;
        this.indices  = [];

        for(let i=0,j=0;i<idxCW.length;i++) {
            const idx = idxCW[i];
            const [v0,v1,v2,v3] = [ vpos[idx[0]], vpos[idx[1]], vpos[idx[2]], vpos[idx[3]] ];
            
            const [p0,p1,p2,p3] = [v0,v1,v2,v3].map( v=>v.map(e=>e*inf) );
            const n = [0,1,2].map( d=> (v0[d]+v1[d]+v2[d]+v3[d])/4 );
            const c = [0.1, 0.1+i*0.1, 0.1];

            this.vertices = this.vertices.concat( p0, p1, p2, p3 );
            this.normals  = this.normals.concat(  n,  n,  n,  n );
            this.colors   = this.colors.concat(   c,  c,  c,  c );
            const order = {'CW' : [0,3,1, 2,1,3],
                           'CCW': [0,1,3, 2,3,1] }.CCW;
            this.indices  = this.indices.concat(order.map(k=>j+k));
            j += 4;
        }
    }

    get length() {
        return this.indices.length;
    }
}

export {Ramiel, Pipe, Universe};
