const BLEND = `float blendColorBurn(float base, float blend) {
      return (blend==0.0)?blend:max((1.0-((1.0-base)/blend)),0.0);
    }

    vec3 blendColorBurn(vec3 base, vec3 blend) {
      return vec3(blendColorBurn(base.r,blend.r),blendColorBurn(base.g,blend.g),blendColorBurn(base.b,blend.b));
    }

    vec3 blendColorBurn(vec3 base, vec3 blend, float opacity) {
      return (blendColorBurn(base, blend) * opacity + base * (1.0 - opacity));
    }

    float blendColorDodge(float base, float blend) {
      return (blend==1.0)?blend:min(base/(1.0-blend),1.0);
    }

    vec3 blendColorDodge(vec3 base, vec3 blend) {
      return vec3(blendColorDodge(base.r,blend.r),blendColorDodge(base.g,blend.g),blendColorDodge(base.b,blend.b));
    }

    vec3 blendColorDodge(vec3 base, vec3 blend, float opacity) {
      return (blendColorDodge(base, blend) * opacity + base * (1.0 - opacity));
    }

    float blendVividLight(float base, float blend) {
      return (blend<0.5)?blendColorBurn(base,(2.0*blend)):blendColorDodge(base,(2.0*(blend-0.5)));
    }

    vec3 blendVividLight(vec3 base, vec3 blend) {
      return vec3(blendVividLight(base.r,blend.r),blendVividLight(base.g,blend.g),blendVividLight(base.b,blend.b));
    }

    vec3 blendVividLight(vec3 base, vec3 blend, float opacity) {
      return (blendVividLight(base, blend) * opacity + base * (1.0 - opacity));
    }

    float blendHardMix(float base, float blend) {
      return (blendVividLight(base,blend)<0.5)?0.0:1.0;
    }

    vec3 blendHardMix(vec3 base, vec3 blend) {
      return vec3(blendHardMix(base.r,blend.r),blendHardMix(base.g,blend.g),blendHardMix(base.b,blend.b));
    }

    vec3 blendHardMix(vec3 base, vec3 blend, float opacity) {
      return (blendHardMix(base, blend) * opacity + base * (1.0 - opacity));
    }`

    const VERT_SHADER = `
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_scroll;
    uniform sampler2D imageTexture;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      float zoom = u_scroll / 1. * (1. - distance(vec2(0.5, 0.5), vUv));
      gl_Position =   projectionMatrix * 
                      modelViewMatrix * 
                      vec4(vec3(position.x, position.y, position.z + u_scroll), 1. + (abs(u_mouse.y) + abs(u_mouse.x)) * -.1);
    }
    `;

    const FRAG_SHADER = `${BLEND}

      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_scroll;
      uniform int u_side;
      uniform sampler2D imageTexture;
      varying vec2 vUv;

      void main() {
        
        vec2 st = vUv;
        vec3 image = texture2D(imageTexture,vUv).xyz;
        float ringCount = 20. -  15. * abs(u_mouse.x);
        float dist = distance(st, vec2(.5, .5));
        float f = fract(dist * ringCount - (u_time / 90.) / 2.);
        float start = .0;
        if (f > .5) {
          start = 1.;
        }
        float end = .5;
        vec3 rings = smoothstep(start, end, f) * vec3(.1) + vec3(.55);

        vec3 color = blendColorDodge(rings, image);
        color.r *= dist * 2. - .1;
        color.g *= dist * 2. - .1;
        color.b *= color.b * color.b - .1;
        
        gl_FragColor = vec4(color, 1.0 - (dist - .30) * 2.2);
      }
    `

    let isHome = false;
    let zoom = 7.5;

    let scrollY = 0;
    let radius = 4.5;
  
    let revealProgress = 0;

    const menuButton = document.querySelector('.menu');
    const menuOverlay = document.querySelector('.menu__overlay');

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(2);

    const canvas = renderer.domElement;
    var camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.01, 400);
    camera.position.set(0,0,30);
    onWindowResize();
    let mouseX = .5;
    let mouseY = .5;
    document.body.appendChild(canvas);

    const texture = new THREE.TextureLoader().load('https://assets.codepen.io/19896/gradient_1.png') // SEAN ADD IMAGE TO WP

    const planeGeometry = new THREE.RingGeometry(3, 5.5, 82);
    const planeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: {value: 1.0},
        u_resolution: {value: {x: window.innerWidth, y: window.innerHeight}},
        u_mouse: {value: new THREE.Vector2()},
        u_scroll: {value: 0.0},
        u_side: {value: 0},
        imageTexture: { type: 't', value: texture },
      },
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);

    const sun = new THREE.PointLight(0xffffff);
    const ambient = new THREE.AmbientLight(0x552299, 10);
    const backlight = new THREE.PointLight(0x116633, 5, 20);
    const colorlight = new THREE.PointLight(0x1111ee, 12);
    const shinelight = new THREE.PointLight(0x3333ee, 2);
    const shinelight2 = new THREE.PointLight(0x0011cc, 2);
    backlight.position.set(0,0,-20);
    colorlight.position.set(0,80,100);
    shinelight.position.set(1000,-13,-10);
    shinelight2.position.set(-1000,-13,10);
    ambient.intensity = 1;
    backlight.position.z = -5 - mouseY * 10;

    scene.add(sun);
    scene.add(backlight);
    scene.add(ambient);
    scene.add(colorlight);
    scene.add(shinelight);
    scene.add(shinelight2);
    let frame = 0;

    // EVENT LISTENERS
    window.addEventListener('resize', onWindowResize, false);
    menuButton.addEventListener('click', toggleMenu);
    menuOverlay.addEventListener('click', toggleMenu);
    window.addEventListener('mousemove', (e) => {
      mouseX = e.pageX / _width;
      mouseY = (e.pageY - scrollY) / _height;
      ambient.intensity = Math.max(2, 1 + 3 * mouseY);
      shinelight.position.y = mouseY * -2000 + 1000;
      shinelight.position.x = mouseX * 1000;  
      shinelight.intensity = Math.max(1, (mouseY - .2) * 10);
      planeMaterial.uniforms.u_mouse.value = {x: mouseX, y: mouseY};
    })

    window.addEventListener('mousedown', () => {
      document.body.classList.add('is-mousedown');
      colorlight.intensity = 0;
      shinelight.intensity = 0;
    })

    window.addEventListener('mouseup', () => {
      document.body.classList.remove('is-mousedown');
      colorlight.intensity = Math.random() * 12 + 5;
      shinelight.intensity = Math.random() * 3 + 1;
    })

    window.addEventListener('scroll', handleScroll)

    setTimeout(() => {
      handleScroll();
      animation();
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
      document.body.classList.add('is-loaded');
    }, 200);

    function toggleMenu() {
      document.body.classList.toggle('is-menu');
    }
    
    function onWindowResize() {
      _width = window.innerWidth;
      _height = window.innerHeight;
      renderer.setSize(_width, _height);

      if (!isHome) {
        zoom = _width / _height * 2.5 + 3;
      }

      camera.aspect = _width / _height;
      camera.updateProjectionMatrix();

      
      if (isHome) {
        videoTop = video.getBoundingClientRect().top + scrollY - _height; 
      }
    }

    function handleScroll() {
      scrollY = document.scrollingElement.scrollTop;

      if (!isHome) return;

      if (scrollY > 50) {
        document.body.classList.add('is-scrolled');
      }
      const currentScroll = (scrollY + _height / 2) / _height - 1;
      currentTitle = Math.floor(currentScroll);
      if (document.querySelector('.is-active-title')) {
        document.querySelector('.is-active-title').classList.remove('is-active-title') 
      }
      if (currentTitle > 0 && titles[currentTitle] && (currentScroll - currentTitle > .2 && currentScroll - currentTitle < .6)) {
        titles[currentTitle].classList.add('is-active-title');
      }
      camera.aspect = _width / _height;
      zoom = (scrollY / _height) * .35 + 1;
      camera.zoom = zoom;
      camera.updateProjectionMatrix();

      videoThumb.style.opacity = 1 - Math.max(0, (scrollY - _height) / _height * 2);
      videoThumbImage.style.transform = `scale(${Math.max(.999, (_height / scrollY) * .999)})`;
      videoThumb.style.transform = `translate(-50%, -50%) scale(${Math.min(.999, 0 + scrollY / _height)})`;  
      if (scrollY > videoTop + _height * 1.5 || scrollY < videoTop + 100) {
        document.body.classList.remove('is-video-playing');
        if (!video.querySelector('video').paused) {
          video.querySelector('video').pause();
        }
      }
    }

    // ANIMATION

    function animation() {
      frame++;
      plane.rotation.z -= .002;
      revealProgress = frame > 90 ? 1 : Math.sin(frame / 60);
      
      planeMaterial.uniforms.u_time.value += 1 + mouseY * 3;

      if (isHome && revealProgress < 1) {
        plane.scale.set(revealProgress,revealProgress,revealProgress);
      } else if (!isHome && revealProgress < 1) {
        plane.scale.set(1.3 - revealProgress * .3, 1.3 - revealProgress * .3, 1.3 - revealProgress * .3);
      } 
      
      renderer.render(scene, camera);
      requestAnimationFrame(animation);
    }