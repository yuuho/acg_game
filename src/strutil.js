'use strict';


class StringData {

    constructor( ctx, str, fontsize, fontfunc=s=>String(Math.ceil(s))+'px serif',
                                     margin_rate=0.02, padding_rate=0.02) {
        // 作成済みコンテキストを使いまわすことで高速化
        // マージンやフォントサイズは変更できるようにしておく
            // 呼び出し元でマージンを計算しておく必要がありつらみもある
        ctx.font = fontfunc(fontsize);
        const metrics = ctx.measureText(str);
        const T = this.ascent  = metrics.actualBoundingBoxAscent;
        const B = this.descent = metrics.actualBoundingBoxDescent;
        const L = this.left    = metrics.actualBoundingBoxLeft;
        const R = this.right   = metrics.actualBoundingBoxRight;
    
        //  ,0,0
        //  +--margined-------------------------+
        //  | +--padded-----------------------+ |
        //  | | +--real---------------------+ | |
        //  | | |      T:top ^              | | |
        //  | | |            |      R:right | | |
        //  | | |<-----------+------------->| | |
        //  | | | L:left     | `pos         | | |
        //  | | |            v B:bottom     | | |
        //  | | +---------------------------+ | |
        //  | +-------------------------------+ |
        //  +-----------------------------------+

        const H = T+B, W = L+R;
        const margin = H*margin_rate;
        const padding = H*padding_rate;
        // relative render pos from LT 
        const stx = margin+padding+L, sty = margin+padding+T;
        // 描画位置
        this.renderPos  = [stx,sty];
        // サイズ
        this.realHeight = H;
        this.realWidth  = W;
        this.paddedHeight = H+padding*2;
        this.paddedWidth  = W+padding*2;
        this.height = H+padding*2+margin*2;
        this.width  = W+padding*2+margin*2;
        // データ
        this.fontsize = fontsize;
        this.fontfunc = fontfunc;
        this.margin   = margin;
        this.padding  = padding;
        this.str      = str;
        // 4点の position
        this.L      = stx-L-padding;
        this.R      = stx+R+padding;
        this.T      = sty-T-padding;
        this.B      = sty+B+padding;
        this.LT     = [this.L, this.T];
        this.RT     = [this.R, this.T];
        this.LB     = [this.L, this.B];
        this.RB     = [this.R, this.B];
        // 既に描画した
        this.isPrinted = false;
    }

    print_to_canvas(ctx, pos, scale, debug=false) {
        this.isPrinted = true;
        ctx.font = this.fontfunc(this.fontsize*scale);
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.fillText(this.str, pos[0]+this.renderPos[0]*scale,
                               pos[1]+this.renderPos[1]*scale );
        // texture position
        const L = (pos[0]+this.L*scale) / ctx.canvas.width;
        const R = (pos[0]+this.R*scale) / ctx.canvas.width;
        const T = (pos[1]+this.T*scale) / ctx.canvas.height;
        const B = (pos[1]+this.B*scale) / ctx.canvas.height;
        if(debug){
            const [x,y] = pos;
            const [mL,mR,mT,mB] = [x, x+this.width*scale, y, y+this.height*scale];
            const [m,p] = [this.margin*scale, this.padding*scale];
            const [pL,pR,pT,pB] = [mL+m, mR-m, mT+m, mB-m];
            const [oL,oR,oT,oB] = [pL+p, pR-p, pT+p, pB-p];
            const [ax,ay] = [x+this.renderPos[0]*scale, y+this.renderPos[1]*scale];
            const line = (sx,sy,ex,ey,c)=>{
                ctx.strokeStyle = c; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx, sy);  ctx.lineTo(ex, ey);
                ctx.closePath();     ctx.stroke();
            };
            // margined bbox
            line(mL,mT, mR,mT, "rgba(255,0,0,1)");
            line(mL,mT, mL,mB, "rgba(255,0,0,1)");
            line(mL,mB, mR,mB, "rgba(255,0,0,1)");
            line(mR,mT, mR,mB, "rgba(255,0,0,1)");
            // padded bbox
            line(mL,pT, mR,pT, "rgba(255,255,0,1)");
            line(pL,mT, pL,mB, "rgba(255,255,0,1)");
            line(mL,pB, mR,pB, "rgba(255,255,0,1)");
            line(pR,mT, pR,mB, "rgba(255,255,0,1)");
            // bbox
            line(mL,oT, mR,oT, "rgba(0,255,0,1)");
            line(oL,mT, oL,mB, "rgba(0,255,0,1)");
            line(mL,oB, mR,oB, "rgba(0,255,0,1)");
            line(oR,mT, oR,mB, "rgba(0,255,0,1)");
            // アンカー位置
            const aL = ax<mL ? ax-(mL-ax) : mL ;
            const aB = ay>mB ? ay-(mB-ay) : mB ;
            line(aL,ay, mR,ay, "rgba(0,255,255,1)");
            line(ax,mT, ax,aB, "rgba(0,255,255,1)");

        }
        return [L,T, R,T, L,B, R,B];
    }
}


export default class StringUtil {

    static blank_bbox( size ) {
        const buff = document.createElement('canvas');
        buff.height = size;
        buff.width = size;
        const buffctx = buff.getContext('2d');
        buffctx.fillStyle = "rgba(0,0,0,1)";
        buffctx.fillRect(0, 0, buff.width, buff.height);
        return buff;
    }

    // 文字列にちょうど合うサイズの canvas 作って文字入れ
    static string_bbox( str, fontsize=100 ) {
        // 裏でフォントのみを生成する。
        const buff = document.createElement('canvas');
        buff.height = fontsize;
        buff.width = fontsize*str.length;
        const buffctx = buff.getContext('2d');
        buffctx.font = String(Math.ceil(fontsize*0.92))+"px serif";
        buff.width = Math.ceil(buffctx.measureText(str).width)+Math.ceil(fontsize*0.08);
        buffctx.fillStyle = "rgba(0,255,0,1)";
        buffctx.fillRect(0, 0, buff.width, buff.height);
        buffctx.fillStyle = "rgba(255,255,255,1)";
        buffctx.font = String(Math.ceil(fontsize*0.92))+"px serif";
        buffctx.fillText(str, Math.ceil(fontsize*0.04), Math.ceil(fontsize*0.92));

        return buff;
    }

    // 正方形 canvas に文字列を入れる
    static single_square( str, size, fontsize) {
        const buff = StringUtil.string_bbox( str, fontsize );

        // bounding box を正方形にする
        const cvs = document.createElement('canvas');
        cvs.height = size;
        cvs.width  = size;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(buff, 0,0,buff.width,buff.height, 0,0,cvs.width,cvs.height);
        
        return cvs;
    }

    // 正方形 canvas に複数の文字列を入れる
    static multi_string_square( strings, size, fontsize ) {
        
        const cvs = document.createElement('canvas');
        cvs.height = size;
        cvs.width  = size;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.fillRect(0, 0, size, size);

        let ratios = [];
        for(let i=0;i<strings.length;i++){
            const buff = strings[i]===''?
                              StringUtil.blank_bbox( fontsize )
                            : StringUtil.string_bbox( strings[i], fontsize );
            ratios.push(buff.width/buff.height);
            ctx.drawImage(buff, 0,0,buff.width,buff.height,
                            0,        cvs.height/strings.length*i,
                            cvs.width,cvs.height/strings.length);
        }
        
        return [cvs,ratios];
    }

    static string_image(str,H,W,fontsize=46,align='start') {
        const cvs = document.createElement('canvas');
        cvs.height = H;
        cvs.width  = W;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = "rgba(0,255,255,1)";
        ctx.fillRect(0, 0, H, W);
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.font = String(fontsize)+"px serif";
        ctx.textAlign = align;
        ctx.fillText(str,0,fontsize);
        return cvs;
    }
    

    static package_solver(height, width, strDatas) {
        // 基準の高さ
        const maxHeight = Math.max(...strDatas.map(d=>d.height));
    
        // 幅長い順にソート
        const sorted = strDatas.map( (d,i)=>[i,d] ).sort( (a,b)=>{
            if(     a[1].width<b[1].width) return  1;
            else if(a[1].width>b[1].width) return -1;
            else                           return  0;
        } );
    
        // 最適な配置を計算 :
        //  列数を上げていって何列のときに最も大きいフォントサイズを使えるか調べる
        let [scale, numCol, numRow] = [-1, null, null];
        let [nextScale, nextNumCol, nextNumRow ] = [ 0, 0,    null];
        let [Wpos,  nextWpos] = [null,null];
        while(nextScale>scale){
            [scale,numCol,numRow,Wpos] = [nextScale,nextNumCol,nextNumRow,nextWpos];
            nextNumCol = numCol + 1;
            nextNumRow = Math.ceil(sorted.length/nextNumCol);
            const H = nextNumRow*maxHeight;             // デフォルト設定での高さ
            // 各列に所属する文字列を取り出して幅の最大値から列幅を計算する
            const colSlices = [...Array(nextNumCol)].map((_,i)=>[i*nextNumRow, (i+1)*nextNumRow]);
            const colWidths = colSlices.map(sl=> Math.max( ...sorted.slice(...sl).map(d=>d[1].width) ));
            nextWpos = colWidths.map( (s=>v=>s+=v)(0) );// 各列の始まるy座標を記憶
            const W = nextWpos[nextWpos.length-1];      // デフォルト設定での幅
            nextScale = Math.min( height/H, width/W);   // スケール値の上限
        }
    
        // 各座標の計算
        Wpos = [0].concat(Wpos.map(v=>v*scale));
        const Hpos = [...Array(numRow)].map((_,i)=>maxHeight*scale*i);
        // 各文字列の描画位置インデックスを取得
        const ptr = [...Array(strDatas.length)].map(()=>null); sorted.map((d,i)=>{ ptr[d[0]]=i; });
        // 各文字列の描画位置を計算
        const poss = ptr.map(i=>[ Wpos[Math.floor(i/numRow)], Hpos[i%numRow] ]);
        return [poss,scale];
    }

    // 
    static get_string_texture( strings, textureSize, fontfunc=(fs)=>String(fs)+"px serif" ) {
        // キャンバス & コンテキスト 作成、初期化
        const cvs = document.createElement('canvas');
        [cvs.height, cvs.width] = [textureSize, textureSize];
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = "rgba(0,255,0,1)"; // テクスチャ背景カラー
        ctx.fillRect(0, 0, cvs.width, cvs.height);
    
        // フォントやマージンの設定
        const fontsize = 80;
        const margin_rate  = 0.02;
        const padding_rate = 0.02;
        // それぞれのテキストの設定(テキスト個数に複製)
        const fontSizes    = strings.map(()=>fontsize);
        const fontFuncs    = strings.map(()=>fontfunc);
        const marginRates  = strings.map(()=>margin_rate);
        const paddingRates = strings.map(()=>padding_rate);
        // それぞれのテキスト
        const strDatas = strings.map( (str,i)=> new StringData( ctx, str, fontSizes[i], fontFuncs[i],
                                                                marginRates[i], paddingRates[i] ) );
        
        // 最適な配置を計算する
        const [poss,scale] = StringUtil.package_solver(cvs.height, cvs.width, strDatas);
        // 配置して、各文字列の四隅のテクスチャ座標を受け取る
        const texPositions = poss.map((pos,i)=>strDatas[i].print_to_canvas(ctx,pos,scale,false));
        return [cvs, texPositions, strDatas];
    }
}
