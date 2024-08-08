import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/environments/RoomEnvironment";

const inputFields = document.querySelectorAll('.form-control');

// Initial state
inputFields.forEach(field => {
  if (field.value.length > 0) {
    field.closest('.input-field').classList.add('is-charged');
  }
});

document.body.addEventListener('change', event => {
	const target = event.target;
	if (target.classList.contains('form-control')) {
		target.closest('.input-field').classList.remove('is-charged');
		if (target.value.length > 0) {
			target.closest('.input-field').classList.add('is-charged');
		}
  	}
});


class Modal {
	constructor(){
		this.backdrop = this._addBackdrop();
	}

	show(status){
		document.body.appendChild(this.backdrop);
		document.body.classList.add('modal-open');

		if (document.querySelector('.modal') === null){

			const modalContent = this._getModalContent(status);
			document.querySelector('body').insertAdjacentHTML('beforeend', modalContent);
	
			this._addBtnCloseAddEventListener();
			this._addEscKeyCloseAddEventListener();
		}
	}

	close(){
		document.body.classList.remove('modal-open');
		document.querySelector('.modal-backdrop')?.remove();
		document.querySelector('.modal')?.remove();
	}

	_addBackdrop(){
		const backdrop = document.createElement('div');
		backdrop.classList.add('modal-backdrop');

		document.addEventListener('click', (event) => {
			const backdrop = event.target.closest('.backdrop') || event.target.classList.contains('modal');
			if (backdrop) {
			  this.close();
			}
		  });

		return backdrop;
	}

	_showModalElement(){
		const modalElement = document.createElement('div');
		modalElement.innerHTML = modalContent;
	}

	_getModalContent(status = 'success'){
		const modalSuccess = `
		 <div class="modal" role="dialog">
			<div class="modal-dialog m-auto" role="document">
				<div class="modal-content modal-success text-center">
					<div class="status-icon mx-auto d-flex" aria-hidden="true">
						<img src="./images/success.svg" alt="" class="m-auto">
					</div>
					<div class="modal-title">Success!</div>
					<p>Registration successful. You\`re going to receive an email with the link to web-app</p>
					<button type="button" class="btn btn-close">OK</button>
					<button type="button" class="btn-close btn-x" aria-label="Close">
						<img src="./images/close.svg" alt="" width="14" height="14">
					</button>
				</div>
			</div>
		</div>
		`;

		const modalError = `
		<div class="modal" role="dialog">
			<div class="modal-dialog m-auto" role="document">
				<div class="modal-content modal-error text-center">
					<div class="status-icon mx-auto d-flex" aria-hidden="true">
						<img src="./images/oops.svg" alt="" class="m-auto">
					</div>
					<div class="modal-title">Ooops...</div>
					<p>Something went wrong</p>
					<button type="button" class="btn btn-close">OK</button>
					<button type="button" class="btn-close btn-x" aria-label="Close">
						<img src="./images/close.svg" alt="" width="14" height="14">
					</button>
				</div>
			</div>
		</div>
	   `;

	   return status === 'error' ? modalError : modalSuccess ;
	}

	_addBtnCloseAddEventListener(){
		document.addEventListener('click', (event) => {
			const btnClose = event.target.closest('.btn-close');
			if (btnClose) {
			  this.close();
			}
		});
	}

	_addEscKeyCloseAddEventListener(){
		document.addEventListener('keydown', (event) => {
			if (event.keyCode === 27){
				this.close();
			}
		})
	}
}

const modal = new Modal();


document.querySelector('form').addEventListener('submit', (e) => {
	e.preventDefault();
	modal.show('success');
	// modal.show('error');
})

class GLTFModelViewer extends HTMLElement {
  constructor() {
    super();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.frame = -1;
    this.render = this.render.bind(this);
    this.onResize = this.onResize.bind(this);
    this.attributeChangedCallback = this.attributeChangedCallback.bind(this);
    this.dragging = false;
  }

  static register() {
    if (typeof customElements.get('gltf-modelviewer') === 'undefined') {
      customElements.define('gltf-modelviewer', GLTFModelViewer);
    }
  }

  static get observedAttributes() {
    return ['src', 'autorotate'];
  }
  
  get autoRotate() {
    return this.hasAttribute('autorotate')
  }
  
  get isInitialized() {
    return Boolean(this.scene && this.controls && this.camera)
  }
  
  onMouseDown(e) {
    console.log('down');
    if (e.target === this.canvas) {
      this.dragging = true;  
    }
  }
  
  onMouseUp(e) {
    this.dragging = false;
  }
  
  attributeChangedCallback(name, oldValue, newValue) { 
    if (name === 'src' && oldValue !== newValue && this.isInitialized) {
      this.cleanupScene();
      this.initScene();
    }
    if (name === 'autorotate' && this.isInitialized) {
      this.updateAutorotate();
    }
  }
  
  updateAutorotate() {
    if (this.isInitialized) {
      this.controls.autoRotate = this.autoRotate;  
      this.controls.update();
    }
    
  }
  
  
  connectedCallback() {
    if (!this.renderer) {
      this.setup();
    }
  }

  disconnectedCallback() {
    this.dispose();
  }

  get fov() {
    return parseInt(this.getAttribute('fov'), 10) || 45;
  }

  get aspectRatio() {
    return this.clientWidth / this.clientWidth || 1;
  }
  
  get src() {
    return this.getAttribute('src');
  }

  get textureSrc() {
    return this.getAttribute('texture');
  }

  setup() {
    const canvas = document.createElement('canvas');
    canvas.classList.add('loading');
    this.appendChild(canvas);
    this.canvas = canvas;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer = renderer;

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
		this.pmremGenerator.compileEquirectangularShader();

		this.neutralEnvironment = this.pmremGenerator.fromScene(new RoomEnvironment()).texture;

    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(
      this.fov,
      this.aspectRatio,
      near,
      far
    );
    camera.position.set(0, 10, 20);
    this.camera = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = THREE.Math.degToRad(120); // Limit vertical rotation
    controls.minPolarAngle = THREE.Math.degToRad(60); // Limit vertical rotation
    controls.maxAzimuthAngle = THREE.Math.degToRad(30); // Limit horizontal rotation
    controls.minAzimuthAngle = THREE.Math.degToRad(-30); // Limit horizontal rotation

    // Random auto-rotation
    function randomAutoRotate() {
      controls.autoRotateSpeed = (Math.random() - 0.5) * 20; // Random speed between -2 and 2
    }
    setInterval(randomAutoRotate, 1000); // Change rotation speed every 2 seconds

    controls.update();
    this.controls = controls;

    const scene = new THREE.Scene();
    this.scene = scene;

    this.scene.environment = this.neutralEnvironment;

    this.initScene();
    
    this.onResize();
    window.addEventListener('resize', this.onResize, false);
    this.updateAutorotate();
    this.frame = requestAnimationFrame(this.render);
  }

  initScene() {
    this.setupLight();
    this.loadModel();
  }

  setupLight() {
    const { scene } = this;
    {
      const skyColor = 0xb1e1ff; // light blue
      const groundColor = 0xb97a20; // brownish orange
      const intensity = 1;
      const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
      scene.add(light);
    }
    {
      const color = 0xffffff;
      const intensity = 0.8;
      const light = new THREE.AmbientLight(color, intensity);
      this.camera.add(light);
    }
    {
      const color = 0xffffff;
      const intensity = 0.3;
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(0, 0, 50);
      scene.add(light);
      scene.add(light.target);
    }
    this.renderer.toneMapping = Number(1);
		this.renderer.toneMappingExposure = Math.pow(2, 1);
  }

  createPlane() {
    const { scene } = this;
    const planeSize = 40;
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/assets/images/pic-1.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);
    const planeGeo = new THREE.PlaneBufferGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -0.5;
    scene.add(mesh);
  }

  loadModel() {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(this.textureSrc);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    // texture.magFilter = THREE.NearestFilter;
    texture.repeat.set(1, 1);

    const { controls, scene, camera, canvas } = this;
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      this.src,
      (gltf) => {
        const root = gltf.scene;
        scene.add(root);
        this.model = root;

        const mesh = this.model.getObjectByName('Circle001_screen_0');
        mesh.material.map = texture
        mesh.material.color.set("#303232")
        mesh.material.metalness = 0
        mesh.material.roughness = 0.5
        mesh.material.emissiveIntensity = 1.0
        mesh.material.needsUpdate = true;

        // compute the box that contains all the stuff
        // from root and below
        const box = new THREE.Box3().setFromObject(root);

        const boxSize = box.getSize(new THREE.Vector3()).length();
        const boxCenter = box.getCenter(new THREE.Vector3());

        // set the camera to frame the box
        this.frameArea(boxSize * 2., boxSize, boxCenter, camera);

        // update the Trackball controls to handle the new size
        controls.maxDistance = boxSize * 10;
        controls.target.copy(boxCenter);
        controls.update();
        canvas.classList.remove('loading');
      }
    );
  }

  /**
   * Arrange the camera so the object fits in the canvas
   * @param {*} sizeToFitOnScreen
   * @param {*} boxSize
   * @param {*} boxCenter
   */
  frameArea(sizeToFitOnScreen, boxSize, boxCenter) {
    const { camera } = this;
    const halfSizeToFitOnScreen = sizeToFitOnScreen * 1.5;
    const halfFovY = THREE.MathUtils.degToRad(camera.fov * 1.5);
    const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);

    // compute a unit vector that points in the direction the camera is now
    // in the xz plane from the center of the box
    const direction = new THREE.Vector3()
      .subVectors(camera.position, boxCenter)
      .multiply(new THREE.Vector3(1, 0, 1))
      .normalize();

    // move the camera to a position distance units way from the center
    // in whatever direction the camera was from the center already
    camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

    // pick some near and far values for the frustum that
    // will contain the box.
    camera.near = boxSize / 100;
    camera.far = boxSize * 100;

    camera.updateProjectionMatrix();

    // point the camera to look at the center of the box
    camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
  }

  /**
   * Clean up the scene materials, meshes, geometries, textures
   */
  cleanupScene(groupOrScene = null) {
    if (groupOrScene === null) {
      groupOrScene = this.scene;
    }
    const items = [...groupOrScene.children];
    for (let item of items) {
      if (item.children && item.children.length > 0) {
        this.cleanupScene(item);
      }
      const { geometry, material, texture } = item;
      if (geometry) {
        geometry.dispose();
      }
      if (material) {
        material.dispose();
      }
      if (texture) {
        texture.dispose();
      }
      if (typeof item.dispose === 'function') {
        item.dispose();
      }
      groupOrScene.remove(item);
    }
  }

  dispose() {
    this.cleanupScene();
    window.removeEventListener('resize', this.onResize, false);
    if (this.frame > -1) {
      cancelAnimationFrame(this.frame);
      this.frame = -1;
    }
    const context = this.renderer.getContext();
    this.renderer.dispose();
    const loseCtx = context.getExtension('WEBGL_lose_context');
    if (loseCtx && typeof loseCtx.loseContext === 'function') {
      loseCtx.loseContext();
    }
    this.removeChild(this.canvas);
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
  }

  onResize() {
    const { renderer, camera } = this;
    camera.aspect = this.clientWidth / this.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(this.clientWidth, this.clientHeight);
  }

  needsResize() {
    const { canvas } = this;
    const dpr = this.devicePixelRatio;
    return (
      canvas.width !== this.clientWidth * dpr ||
      canvas.height !== this.clientHeight * dpr
    );
  }

  render() {
    const { renderer, scene, camera } = this;
    if (this.needsResize()) {
      this.onResize();
    }
    this.controls.update();
    renderer.render(scene, camera);
    this.frame = requestAnimationFrame(this.render);
  }
}

GLTFModelViewer.register();
