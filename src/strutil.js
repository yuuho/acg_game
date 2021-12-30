
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
    
}
