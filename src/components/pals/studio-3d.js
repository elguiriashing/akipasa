/* AkiPals 3D: real, first-party, commercially licensed rigged GLBs + authored wardrobe geometry. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

const SKINS = {
  porcelain: "#f2d6c7", light: "#e8c1a8", warm: "#d6a181",
  olive: "#b78b69", brown: "#946547", deep: "#664231",
};
const HAIR = {
  black: "#17191e", espresso: "#352523", chestnut: "#694332",
  auburn: "#a65f43", blonde: "#c99a59", silver: "#a9afb7",
  pink: "#b77892", blue: "#4d6ca3",
};
const EYES = {
  brown: "#573b31", hazel: "#8b714a", green: "#4e7462",
  blue: "#5689bb", grey: "#828a98",
};
const COLORS = {
  orange: "#ff834b", ink: "#2a2e3a", cream: "#ede2d5",
  mint: "#78bcae", purple: "#836ca8", red: "#bb5160",
};
const BOTTOMS = { cargo: "#2b303a", jeans: "#425879", tailored: "#25242f", shorts: "#54687c" };
const shoes = { sneakers: "#f0eee7", boots: "#514139", trainers: "#bec8c8" };
const loader = new GLTFLoader();
const models = new Map();

function material(color, roughness = 0.72, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function addEllipsoid(parent, { x, y, z, rx, ry, rz, mat, details = 20 }) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, details, 16), mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function segment(parent, start, end, a, b, mat, radial = 14) {
  const point1 = new THREE.Vector3(...start);
  const point2 = new THREE.Vector3(...end);
  const length = point1.distanceTo(point2);
  const geometry = new THREE.CylinderGeometry(b, a, length, radial, 1, false);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.copy(point1.clone().add(point2).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), point2.clone().sub(point1).normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function curve(parent, pts, radius, mat, divisions = 20) {
  const points = pts.map((v) => new THREE.Vector3(...v));
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), divisions, radius, 7, false), mat
  );
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function makeHair(a) {
  const group = new THREE.Group();
  group.name = "AkiPals hairstyle: " + a.hair;
  const color = HAIR[a.hairColor];
  const main = material(color, 0.42);
  const shine = material(new THREE.Color(color).multiplyScalar(1.17), 0.45);
  const crown = { x: 0, y: 1.728, z: -0.014, rx: .125, ry: a.hair==="buzz" ? .044 : .080, rz: .127, mat: main, details: 32 };
  addEllipsoid(group, crown);
  // Each style is real 3D geometry with volume, not a sprite or SVG.
  switch (a.hair) {
    case "buzz":
      break;
    case "crop":
    case "quiff": {
      const spikes = a.hair === "quiff" ? 13 : 9;
      for (let i = 0; i < spikes; i++) {
        const x = -.101 + (i / (spikes - 1)) * .202;
        const lift = a.hair === "quiff" ? 0.065 : 0.024;
        curve(group, [
          [x, 1.744, .078], [x * .9, 1.777 + lift, .086],
          [x * .86 + .023, 1.768 + lift * .6, .103],
          [x + .018, 1.721, .113]
        ], .016 + .004 * (i % 3), i % 2 ? main : shine, 14);
      }
      break;
    }
    case "bob":
    case "long": {
      const bottom = a.hair === "long" ? 1.16 : 1.47;
      for (const side of [-1, 1]) {
        addEllipsoid(group, {
          x: side * .115, y: (bottom + 1.66) / 2, z: -.035,
          rx: .056, ry: (1.70 - bottom) / 2, rz: .105, mat: main,
        });
        for (let i = 0; i < 7; i++) {
          const angle = (i / 6) * Math.PI;
          curve(group, [
            [side * (.092 + i * .004), 1.73, -.06 + i * .020],
            [side * (.144 + i * .004), 1.59, .015 + i * .006],
            [side * (.136 + i * .007), bottom, .015 + .009 * Math.sin(angle)],
          ], .009, i % 2 ? shine : main, 16);
        }
      }
      break;
    }
    case "bun": {
      addEllipsoid(group, {x:0,y:1.837,z:-.047,rx:.096,ry:.080,rz:.086,mat:main});
      for (let i=0;i<12;i++) {
        const t=i * Math.PI / 6;
        addEllipsoid(group,{x:.065*Math.sin(t),y:1.847+.048*Math.cos(t),z:-.055+.047*Math.sin(t),rx:.029,ry:.034,rz:.029,mat:i%3?main:shine});
      }
      for (const side of [-1,1]) curve(group,[
        [side*.112,1.707,.063],[side*.140,1.588,.088],[side*.134,1.469,.104]
      ],.009,shine);
      break;
    }
    case "curls": {
      for (let ring = 0; ring < 3; ring++) {
        const n = 17 + ring * 3;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          const x = Math.sin(t) * (.105 + ring * .014);
          const z = Math.cos(t) * (.103 + ring * .010);
          const y = 1.748 - ring * .054 + .02 * Math.cos(t * 3 + ring);
          addEllipsoid(group, {
            x, y, z, rx:.026, ry:.030, rz:.029,
            mat:i%4===0?shine:main, details:12,
          });
        }
      }
      break;
    }
    default: break;
  }
  return group;
}

/** Lightweight first-party sculptural facial overlays for the editable preview. */
function makeFaceDetails(a) {
  const face = new THREE.Group();
  face.name = "Editable facial feature geometry";
  const skin = material(SKINS[a.skin], .75);
  const eyebrows = material(HAIR[a.hairColor], .85);
  const whites = material("#fffaf3", .35);
  const iris = material(EYES[a.eyeColor], .3);
  const lips = material("#a35b5b", .74);
  const shadow = material("#634b49", .87);
  const eyeY = a.bodyStyle === "masculine" ? 1.699 : 1.656;
  const noseY = eyeY - .045;
  const mouthY = eyeY - .097;
  const faceZ = .115;
  const eyeSize = a.eyes === "wide" ? .020 : a.eyes === "almond" ? .011 : .016;
  const browRaise = a.brows === "arched" ? .013 : 0;
  const browWidth = a.brows === "bold" ? .006 : .004;
  for(const side of [-1,1]){
    // Eye socket, eye white, coloured iris and catchlight are separate lit volumes.
    addEllipsoid(face,{x:side*.048,y:eyeY,z:faceZ,rx:.024,ry:eyeSize+.004,rz:.011,mat:shadow,details:18});
    addEllipsoid(face,{x:side*.048,y:eyeY,z:faceZ+.009,rx:.021,ry:eyeSize,rz:.012,mat:whites,details:20});
    addEllipsoid(face,{x:side*.048,y:eyeY,z:faceZ+.019,rx:.009,ry:.011,rz:.009,mat:iris,details:18});
    addEllipsoid(face,{x:side*.046,y:eyeY+.005,z:faceZ+.027,rx:.003,ry:.003,rz:.003,mat:whites,details:10});
    curve(face,[
      [side*.028,eyeY+.041+browRaise,faceZ+.001],
      [side*.048,eyeY+.046+browRaise*1.5,faceZ+.007],
      [side*.071,eyeY+.035+browRaise,faceZ]
    ],browWidth,eyebrows,12);
    const earWidth = a.ears==="prominent"?.031:a.ears==="small"?.015:.023;
    addEllipsoid(face,{x:side*.111,y:eyeY-.025,z:.006,rx:earWidth,ry:.033,rz:.018,mat:skin,details:18});
  }
  const nose = a.nose==="straight"?.019:a.nose==="button"?.013:.016;
  addEllipsoid(face,{x:0,y:noseY,z:faceZ+.006,rx:nose,ry:.030,rz:.024,mat:skin,details:20});
  addEllipsoid(face,{x:0,y:noseY-.024,z:faceZ+.019,rx:nose*1.22,ry:.014,rz:.019,mat:skin,details:16});
  const smile = a.mouth==="smile" ? .012 : a.mouth==="grin" ? .020 : 0;
  curve(face,[
    [-.031,mouthY+smile,faceZ+.007],[0,mouthY,faceZ+.026],[.031,mouthY+smile,faceZ+.007]
  ],a.mouth==="grin"?.006:.004,lips,14);
  if(a.chin!=="soft"){
    addEllipsoid(face,{x:0,y:mouthY-.038,z:faceZ-.007,rx:a.chin==="square"?.036:.023,ry:.022,rz:.009,mat:skin,details:16});
  }
  if(a.neck==="broad"||a.neck==="slim"){
    const radius=a.neck==="broad"?.058:.038;
    addEllipsoid(face,{x:0,y:1.476,z:0,rx:radius,ry:.053,rz:.047,mat:skin,details:20});
  }
  return face;
}

function makeWardrobe(a) {
  const group = new THREE.Group();
  group.name = "AkiPals original clothing";
  const textile = material(COLORS[a.topColor], a.top==="jacket" ? .45 : .91);
  const trim = material(a.topColor==="cream"?"#8b8078":"#f8dac5", .81);
  const pants = material(BOTTOMS[a.bottom] || BOTTOMS.cargo, .82);
  const dark = material("#22252e", .52);
  const gold = material("#f8aa61", .42, .3);
  const footwear = material(shoes[a.shoes] || shoes.sneakers, .45);
  const skin = material(SKINS[a.skin], .79);
  // Curved cloth volume and a visible ribbed collar, not a painted bodysuit.
  addEllipsoid(group,{x:0,y:1.305,z:0,rx:.210,ry:.263,rz:.145,mat:textile,details:32});
  addEllipsoid(group,{x:0,y:1.485,z:.023,rx:.143,ry:.061,rz:.104,mat:trim,details:24});
  addEllipsoid(group,{x:0,y:1.502,z:.028,rx:.104,ry:.044,rz:.085,mat:skin,details:24});
  for(const side of [-1,1]){
    const radius = a.top==="hoodie" || a.top==="sweater" ? .091 : .069;
    segment(group,[side*.201,1.444,0],[side*.357,1.187,0],radius,radius*.82,textile);
    if(a.top==="tee"){
      segment(group,[side*.200,1.444,0],[side*.272,1.315,0],radius,radius*.96,textile);
      segment(group,[side*.272,1.315,0],[side*.357,1.187,0],.057,.048,skin);
    }else{
      segment(group,[side*.356,1.192,0],[side*.366,1.164,0],radius*.75,radius*.79,trim);
    }
  }
  if(a.top==="hoodie"){
    addEllipsoid(group,{x:0,y:1.468,z:-.083,rx:.147,ry:.121,rz:.096,mat:textile});
    curve(group,[[-.017,1.487,.141],[-.027,1.379,.150]],.0035,trim);
    curve(group,[[.017,1.487,.141],[.027,1.379,.150]],.0035,trim);
    addEllipsoid(group,{x:0,y:1.197,z:.151,rx:.131,ry:.052,rz:.025,mat:textile});
  }else if(a.top==="jacket"){
    curve(group,[[0,1.515,.149],[0,1.33,.158],[0,1.095,.135]],.006,trim);
    curve(group,[[-.095,1.493,.118],[0,1.401,.157],[.094,1.493,.118]],.008,dark);
    for(const y of [1.31,1.25,1.19])addEllipsoid(group,{x:.01,y,z:.167,rx:.006,ry:.006,rz:.007,mat:gold,details:12});
  } else if(a.top==="sweater"){
    for(const y of [1.092,1.103,1.114]) curve(group,[[-.18,y,.080],[0,y,.140],[.18,y,.080]],.004,trim,14);
  }
  const short = a.bottom === "shorts";
  const wide = a.bottom === "cargo" ? .127 : a.bottom === "tailored" ? .092 : .105;
  addEllipsoid(group,{x:0,y:1.019,z:0,rx:.193,ry:.135,rz:.133,mat:pants});
  for(const side of [-1,1]){
    const top = [side*.100,1.02,0];
    const ankle = [side*.112,short?.59:.15,.010];
    segment(group,top,ankle,wide,wide*(a.bottom==="cargo"?1.05:.88),pants,20);
    if(short) segment(group,[side*.112,.61,0],[side*.112,.15,0],.062,.049,skin,14);
    if(a.bottom==="cargo"){
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(.101,.133,.027),pants);
      pocket.position.set(side*.178,.73,.093);pocket.castShadow=true;group.add(pocket);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(.11,.030,.035),dark);
      flap.position.set(side*.178,.785,.099);group.add(flap);
    }
    addEllipsoid(group,{x:side*.112,y:.08,z:.076,rx:.108,ry:.082,rz:.191,mat:footwear,details:24});
    curve(group,[
      [side*.062,.100,.192],[side*.112,.115,.205],[side*.160,.100,.192]
    ],.007,trim,12);
  }
  if(a.bag==="crossbody"){
    curve(group,[[-.155,1.496,.128],[-.083,1.405,.171],[.07,1.244,.189],[.148,1.124,.156]],.012,dark,28);
    const bag=new THREE.Mesh(new THREE.BoxGeometry(.191,.141,.077),dark);
    bag.position.set(.123,1.115,.207);bag.rotation.z=-.12;bag.castShadow=true;group.add(bag);
    addEllipsoid(group,{x:.124,y:1.127,z:.254,rx:.020,ry:.020,rz:.008,mat:gold,details:12});
  } else if(a.bag==="backpack"){
    addEllipsoid(group,{x:0,y:1.302,z:-.171,rx:.163,ry:.197,rz:.088,mat:dark});
    for(const s of [-1,1])curve(group,[[s*.113,1.464,-.103],[s*.153,1.305,-.18],[s*.134,1.149,-.13]],.018,gold);
  }
  if(a.accessory==="glasses"){
    const frame=material("#e4bb8d",.34,.65);
    for(const s of [-1,1]){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.044,.007,8,24),frame);
      ring.position.set(s*.056,1.649,.127);group.add(ring);
    }
    segment(group,[-.012,1.649,.135],[.012,1.649,.135],.005,.005,frame,8);
  } else if(a.accessory==="earrings"){
    const frame=material("#f0b978",.23,.75);
    for(const s of [-1,1]){
      const hoop=new THREE.Mesh(new THREE.TorusGeometry(.029,.005,8,22),frame);
      hoop.position.set(s*.128,1.571,.005);hoop.rotation.y=s*.4;group.add(hoop);
    }
  } else if(a.accessory==="cap"){
    const hat=material("#232936",.64);
    addEllipsoid(group,{x:0,y:1.787,z:.003,rx:.137,ry:.080,rz:.134,mat:hat});
    addEllipsoid(group,{x:0,y:1.747,z:.115,rx:.118,ry:.014,rz:.093,mat:hat});
  }
  return group;
}

function applyBaseColors(base,a){
  base.traverse((node)=>{
    if(!node.isMesh)return;
    let c=SKINS[a.skin];
    if(/eyes/i.test(node.name)) c=EYES[a.eyeColor];
    else if(/brow|face/i.test(node.name) && !/female|male/i.test(node.name)) c=HAIR[a.hairColor];
    if(node.material?.userData?.akipalsMutable)node.material.dispose();
    node.material=material(c, /eyes/i.test(node.name) ? .22 : .78);
    node.material.userData.akipalsMutable=true;
    node.visible = !/^(Eyes|Eyebrows|Face|Face\.001)$/i.test(node.name);
    node.castShadow=true;
    node.receiveShadow=true;
  });
  const head = base.getObjectByName("Head");
  if(head){
    const size = a.face==="round" ? [1.09,.98,1] : a.face==="angular" ? [.92,1.05,.98] : [1,1,1];
    head.scale.set(...size);
  }
}
function clearGroup(group) {
  if (!group) return;
  group.parent?.remove(group);
  group.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const materials=Array.isArray(node.material)?node.material:[node.material];
      for(const mat of materials)mat.dispose?.();
    }
  });
}
function create(container) {
  if (!container || !container.isConnected) throw new Error("3D stage not mounted");
  const prefersReducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance",preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.42;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000,0);
  renderer.domElement.setAttribute("aria-label","Interactive 3D character. Drag to rotate, scroll or pinch to zoom.");
  renderer.domElement.setAttribute("role","img");
  renderer.domElement.style.cssText="width:100%;height:100%;display:block;touch-action:none;";
  container.replaceChildren(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(33,1,.05,90);
  camera.position.set(0,1.33,3.42);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,.99,0);
  controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.07;
  controls.minDistance=2.05;controls.maxDistance=4.8;
  controls.minPolarAngle=.67;controls.maxPolarAngle=2.07;
  controls.update();
  scene.add(new THREE.HemisphereLight("#eaf5ff","#725146",2.3));
  const light=(color,intensity,x,y,z,shadow=false)=>{
    const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);l.castShadow=shadow;
    if(shadow){
      l.shadow.mapSize.set(1024,1024);l.shadow.camera.left=-3;l.shadow.camera.right=3;
      l.shadow.camera.top=4;l.shadow.camera.bottom=-3;l.shadow.bias=-.0002;
    }
    scene.add(l);
  };
  light("#ffe1c7",3.2,-2.5,4,3,true);
  light("#ff8c58",2.4,2,3,-3,false);
  light("#afc9ff",.86,-3,1,-1,false);
  const stageMat=new THREE.MeshStandardMaterial({color:"#1a1c27",roughness:.43,metalness:.11});
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(.84,.87,.07,64),stageMat);
  floor.position.y=-.10;floor.receiveShadow=true;scene.add(floor);
  const ringMat=new THREE.MeshBasicMaterial({color:"#da835b",transparent:true,opacity:.4});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.76,.008,6,80),ringMat);
  ring.rotation.x=-Math.PI/2;ring.position.y=-.058;scene.add(ring);
  const root=new THREE.Group();scene.add(root);
  let base=null,cloth=null,hair=null,faceDetails=null,loadNumber=0,active=true,raf=0;
  let faceType=null,previousStyle=null;
  const resize=()=>{
    if(!active)return;
    const w=Math.max(container.clientWidth,1),h=Math.max(container.clientHeight,1);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  let frame=0;
  const tick=()=>{
    if(!active)return;
    raf=requestAnimationFrame(tick);
    frame+=.016;
    if(!prefersReducedMotion){root.position.y=Math.sin(frame*.8)*.007;}
    controls.update();renderer.render(scene,camera);
  };
  tick();
  async function setAppearance(a){
    const model=a.bodyStyle==="masculine"?"male":"female";
    const number=++loadNumber;
    try{
      if(!base||faceType!==model){
        let cached=models.get(model);
        if(!cached){
          cached=await loader.loadAsync("/pals/models/akipals-base-"+model+".glb");
          models.set(model,cached);
        }
        if(!active||number!==loadNumber)return;
        if(base)root.remove(base);
        base=cloneSkeleton(cached.scene);
        root.add(base);
        faceType=model;
      }
      if(!active||number!==loadNumber)return;
      applyBaseColors(base,a);
      clearGroup(cloth);clearGroup(hair);clearGroup(faceDetails);
      cloth=makeWardrobe(a);hair=makeHair(a);faceDetails=makeFaceDetails(a);
      root.add(cloth,hair,faceDetails);
      const frameWidth= a.build==="broad"?1.1:a.build==="slim"?.91:1;
      root.scale.set(frameWidth*(a.shoulders==="wide"?1.04:a.shoulders==="narrow"?.95:1),
        a.height==="tall"?1.055:a.height==="short"?.94:1,frameWidth*.96);
      root.position.y=a.height==="short"?.01:0;
      previousStyle=JSON.stringify(a);
      container.dataset.rendered="true";
      container.dispatchEvent(new CustomEvent("akipals:rendered",{detail:{model}}));
    }catch(error){
      if(active&&number===loadNumber){
        container.dataset.rendered="error";
        container.dispatchEvent(new CustomEvent("akipals:error",{detail:{message:"The 3D model could not load. Please retry."}}));
      }
      console.error("AkiPals 3D stage load failure",error);
    }
  }
  return {
    setAppearance,
    rotate(angle=Math.PI/4){
      camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),angle);
      controls.update();
    },
    screenshot(){
      renderer.render(scene,camera);
      return renderer.domElement.toDataURL("image/png");
    },
    get currentStyle(){return previousStyle},
    dispose(){
      active=false;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();
      clearGroup(cloth);clearGroup(hair);clearGroup(faceDetails);floor.geometry.dispose();ring.geometry.dispose();
      floor.material.dispose();ring.material.dispose();renderer.dispose();container.replaceChildren();
    }
  };
}
window.AkiPals3D={mount:create};
window.dispatchEvent(new Event("akipals:3d-ready"));
