/**
 * Shader used for combining the multiple render passes
 * 
 * Basically we set render target screen to false for our effects passes, so they render to a texture. Then for each pixel
 * we blend the layers together.
 */

export class CompositionShader {

    static fragment: string = `
        uniform sampler2D baseTexture;
        uniform sampler2D bloomTexture;
        uniform sampler2D overlayTexture;

        varying vec2 vUv;

        void main() {

            vec4 base = texture2D( baseTexture, vUv );
            vec4 bloom = vec4( 0.9 ) * texture2D( bloomTexture, vUv );
            vec3 color = base.rgb + bloom.rgb;
            float bloomAlpha = max( max( bloom.r, bloom.g ), bloom.b );
            float alpha = clamp( max( base.a, bloomAlpha ), 0.0, 1.0 );

            // Baselayer + bloomlayer + 0.2(overlay)
            gl_FragColor = vec4( color, alpha );

        }
`

    static vertex: string = `
        varying vec2 vUv;

        void main() {

            vUv = uv;

            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

        }
`
}
