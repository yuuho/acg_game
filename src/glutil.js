'use strict';

export default class GLUtil {
    
    // compiling & error logging
    static createProgram( gl, vertexSrc, fragmentSrc ) {
        const vshd = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource(  vshd, vertexSrc );
        gl.compileShader( vshd );
        if(!gl.getShaderParameter( vshd, gl.COMPILE_STATUS ))
            throw new Error( "Unable to compile shader: "+gl.getShaderInfoLog( vshd ));
        const fshd = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource(  fshd, fragmentSrc );
        gl.compileShader( fshd );
        if(!gl.getShaderParameter( fshd, gl.COMPILE_STATUS ))
            throw new Error( "Unable to compile shader: "+gl.getShaderInfoLog( fshd ));
        const prog = gl.createProgram();
        gl.attachShader( prog, vshd );
        gl.attachShader( prog, fshd );
        gl.linkProgram(  prog );
        if(!gl.getProgramParameter( prog, gl.LINK_STATUS ))
            throw new Error( "Unable to link program: "+gl.getProgramInfoLog( prog ));
        return prog;
    }

    static createVBO(gl, data) {
        const buffer_object = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer_object);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return buffer_object;
    }

    static createIBO(gl, data) {
        const buffer_object = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer_object);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return buffer_object;
    }

    static sendVBO(gl, program, name, buffer_object, stride) {
        const pointer = gl.getAttribLocation(program, name);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer_object );
        gl.enableVertexAttribArray( pointer );
        gl.vertexAttribPointer( pointer, stride, gl.FLOAT, false, 0, 0);
    }

    static sendIBO(gl, buffer_object) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer_object );
    }

    static makeStrip(vertice, names) {
        const vbo = [];
        names.forEach(name=>vbo.push(vertice[name]));
        return vbo.flat();
    }

    static createTexture(gl, canvas, size=512) {
        const texObj = gl.createTexture();
        // テクスチャをバインドする
        gl.bindTexture(gl.TEXTURE_2D, texObj);
        // テクスチャへイメージを適用
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                            size,size,0,
                            gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        // ミップマップを生成
        gl.generateMipmap(gl.TEXTURE_2D);
        // テクスチャのバインドを無効化
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texObj;
    }

}