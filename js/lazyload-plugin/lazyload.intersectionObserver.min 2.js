(function(global,factory){typeof exports==="object"&&typeof module!=="undefined"?module.exports=factory():typeof define==="function"&&define.amd?define(factory):global.IntersectionObserver=factory()})(this,function(){"use strict";var getEmptyRect=function getEmptyRect(){return{top:0,bottom:0,left:0,right:0,width:0,height:0}};var now=function now(){if(window.performance&&performance.now){return performance.now()}else{return(new Date).getTime()}};var throttle=function throttle(fn,timeout){var opts=arguments.length>2&&arguments[2]!==undefined?arguments[2]:{maxTime:1e3};var timer=null;var lastTime=0;var maxTime=opts.maxTime;return function(){if(!timer){timer=setTimeout(function(){lastTime=now();fn();timer=null},timeout)}else if(now()-lastTime>maxTime){fn();clearTimeout(timer);timer=null}}};var computeRectIntersection=function computeRectIntersection(rect1,rect2){var top=Math.max(rect1.top,rect2.top);var bottom=Math.min(rect1.bottom,rect2.bottom);var left=Math.max(rect1.left,rect2.left);var right=Math.min(rect1.right,rect2.right);var width=right-left;var height=bottom-top;return width>=0&&height>=0&&{top:top,bottom:bottom,left:left,right:right,width:width,height:height}};var getBoundingClientRect=function getBoundingClientRect(el){var rect;try{rect=el.getBoundingClientRect()}catch(err){}if(!rect)return getEmptyRect();if(!(rect.width&&rect.height)){rect={top:rect.top,right:rect.right,bottom:rect.bottom,left:rect.left,width:rect.right-rect.left,height:rect.bottom-rect.top}}return rect};var containsDeep=function containsDeep(parent,child){var node=child;while(node){if(node==parent)return true;node=getParentNode(node)}return false};var getParentNode=function getParentNode(node){var parent=node.parentNode;if(parent&&parent.nodeType==11&&parent.host){return parent.host}return parent};var classCallCheck=function(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}};var createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor}}();var IntersectionObserverEntry$1=function IntersectionObserverEntry(entry){classCallCheck(this,IntersectionObserverEntry);this.time=entry.time;this.target=entry.target;this.rootBounds=entry.rootBounds;this.boundingClientRect=entry.boundingClientRect;this.intersectionRect=entry.intersectionRect||getEmptyRect();this.isIntersecting=!!entry.intersectionRect;var targetRect=this.boundingClientRect;var targetArea=targetRect.width*targetRect.height;var intersectionRect=this.intersectionRect;var intersectionArea=intersectionRect.width*intersectionRect.height;if(targetArea){this.intersectionRatio=intersectionArea/targetArea}else{this.intersectionRatio=this.isIntersecting?1:0}};var addEvent=function addEvent(node,event,fn){var opt_useCapture=arguments.length>3&&arguments[3]!==undefined?arguments[3]:false;if(node.addEventListener){node.addEventListener(event,fn,opt_useCapture)}else if(node.attachEvent){node.attachEvent("on"+event,fn)}};var removeEvent=function removeEvent(node,event,fn){var opt_useCapture=arguments.length>3&&arguments[3]!==undefined?arguments[3]:false;if(node.removeEventListener){node.removeEventListener(event,fn,opt_useCapture)}else if(node.detatchEvent){node.detatchEvent("on"+event,fn)}};var registry=[];var IntersectionObserver$2=function(){function IntersectionObserver(callback){var options=arguments.length>1&&arguments[1]!==undefined?arguments[1]:{};classCallCheck(this,IntersectionObserver);this.THROTTLE_TIMEOUT=100;this.POLL_INTERVAL=null;if(typeof callback!="function"){throw new Error("callback must be a function")}if(options.root&&options.root.nodeType!=1){throw new Error("root must be an Element")}this._checkForIntersections=throttle(this._checkForIntersections.bind(this),this.THROTTLE_TIMEOUT);this._callback=callback;this._observationTargets=[];this._queuedEntries=[];this._rootMarginValues=this._parseRootMargin(options.rootMargin);this.thresholds=this._initThresholds(options.threshold);this.root=options.root||null;this.rootMargin=this._rootMarginValues.map(function(margin){return margin.value+margin.unit}).join(" ")}createClass(IntersectionObserver,[{key:"observe",value:function observe(target){if(this._observationTargets.some(function(item){return item.element==target})){return}if(!(target&&target.nodeType==1)){throw new Error("target must be an Element")}this._registerInstance();this._observationTargets.push({element:target,entry:null});this._monitorIntersections()}},{key:"unobserve",value:function unobserve(target){this._observationTargets=this._observationTargets.filter(function(item){return item.element!=target});if(!this._observationTargets.length){this._unmonitorIntersections();this._unregisterInstance()}}},{key:"disconnect",value:function disconnect(){this._observationTargets=[];this._unmonitorIntersections();this._unregisterInstance()}},{key:"takeRecords",value:function takeRecords(){var records=this._queuedEntries.slice();this._queuedEntries=[];return records}},{key:"_initThresholds",value:function _initThresholds(){var threshold=arguments.length>0&&arguments[0]!==undefined?arguments[0]:[0];if(!Array.isArray(threshold))threshold=[threshold];return threshold.sort().filter(function(t,i,a){if(typeof t!="number"||isNaN(t)||t<0||t>1){throw new Error("threshold must be a number between 0 and 1 inclusively")}return t!==a[i-1]})}},{key:"_parseRootMargin",value:function _parseRootMargin(opt_rootMargin){var marginString=opt_rootMargin||"0px";var margins=marginString.split(/\s+/).map(function(margin){var parts=/^(-?\d*\.?\d+)(px|%)$/.exec(margin);if(!parts){throw new Error("rootMargin must be specified in pixels or percent")}return{value:parseFloat(parts[1]),unit:parts[2]}});margins[1]=margins[1]||margins[0];margins[2]=margins[2]||margins[0];margins[3]=margins[3]||margins[1];return margins}},{key:"_monitorIntersections",value:function _monitorIntersections(){if(!this._monitoringIntersections){this._monitoringIntersections=true;this._checkForIntersections();if(this.POLL_INTERVAL){this._monitoringInterval=setInterval(this._checkForIntersections,this.POLL_INTERVAL)}else{addEvent(window,"resize",this._checkForIntersections,true);addEvent(document,"scroll",this._checkForIntersections,true);if("MutationObserver"in window){this._domObserver=new MutationObserver(this._checkForIntersections);this._domObserver.observe(document,{attributes:true,childList:true,characterData:true,subtree:true})}}}}},{key:"_unmonitorIntersections",value:function _unmonitorIntersections(){if(this._monitoringIntersections){this._monitoringIntersections=false;clearInterval(this._monitoringInterval);this._monitoringInterval=null;removeEvent(window,"resize",this._checkForIntersections,true);removeEvent(document,"scroll",this._checkForIntersections,true);if(this._domObserver){this._domObserver.disconnect();this._domObserver=null}}}},{key:"_checkForIntersections",value:function _checkForIntersections(){var rootIsInDom=this._rootIsInDom();var rootRect=rootIsInDom?this._getRootRect():getEmptyRect();this._observationTargets.forEach(function(item){var target=item.element;var targetRect=getBoundingClientRect(target);var rootContainsTarget=this._rootContainsTarget(target);var oldEntry=item.entry;var intersectionRect=rootIsInDom&&rootContainsTarget&&this._computeTargetAndRootIntersection(target,rootRect);var newEntry=item.entry=new IntersectionObserverEntry$1({time:now(),target:target,boundingClientRect:targetRect,rootBounds:rootRect,intersectionRect:intersectionRect});if(!oldEntry){this._queuedEntries.push(newEntry)}else if(rootIsInDom&&rootContainsTarget){if(this._hasCrossedThreshold(oldEntry,newEntry)){this._queuedEntries.push(newEntry)}}else{if(oldEntry&&oldEntry.isIntersecting){this._queuedEntries.push(newEntry)}}},this);if(this._queuedEntries.length){this._callback(this.takeRecords(),this)}}},{key:"_computeTargetAndRootIntersection",value:function _computeTargetAndRootIntersection(target,rootRect){if(window.getComputedStyle(target).display=="none")return;var targetRect=getBoundingClientRect(target);var intersectionRect=targetRect;var parent=getParentNode(target);var atRoot=false;while(!atRoot){var parentRect=null;var parentComputedStyle=parent.nodeType==1?window.getComputedStyle(parent):{};if(parentComputedStyle.display=="none")return;if(parent==this.root||parent==document){atRoot=true;parentRect=rootRect}else{if(parent!=document.body&&parent!=document.documentElement&&parentComputedStyle.overflow!="visible"){parentRect=getBoundingClientRect(parent)}}if(parentRect){intersectionRect=computeRectIntersection(parentRect,intersectionRect);if(!intersectionRect)break}parent=getParentNode(parent)}return intersectionRect}},{key:"_getRootRect",value:function _getRootRect(){var rootRect;if(this.root){rootRect=getBoundingClientRect(this.root)}else{var html=document.documentElement;var body=document.body;rootRect={top:0,left:0,right:html.clientWidth||body.clientWidth,width:html.clientWidth||body.clientWidth,bottom:html.clientHeight||body.clientHeight,height:html.clientHeight||body.clientHeight}}return this._expandRectByRootMargin(rootRect)}},{key:"_expandRectByRootMargin",value:function _expandRectByRootMargin(rect){var margins=this._rootMarginValues.map(function(margin,i){return margin.unit=="px"?margin.value:margin.value*(i%2?rect.width:rect.height)/100});var newRect={top:rect.top-margins[0],right:rect.right+margins[1],bottom:rect.bottom+margins[2],left:rect.left-margins[3]};newRect.width=newRect.right-newRect.left;newRect.height=newRect.bottom-newRect.top;return newRect}},{key:"_hasCrossedThreshold",value:function _hasCrossedThreshold(oldEntry,newEntry){var oldRatio=oldEntry&&oldEntry.isIntersecting?oldEntry.intersectionRatio||0:-1;var newRatio=newEntry.isIntersecting?newEntry.intersectionRatio||0:-1;if(oldRatio===newRatio)return;for(var i=0;i<this.thresholds.length;i++){var threshold=this.thresholds[i];if(threshold==oldRatio||threshold==newRatio||threshold<oldRatio!==threshold<newRatio){return true}}}},{key:"_rootIsInDom",value:function _rootIsInDom(){return!this.root||containsDeep(document,this.root)}},{key:"_rootContainsTarget",value:function _rootContainsTarget(target){return containsDeep(this.root||document,target)}},{key:"_registerInstance",value:function _registerInstance(){if(registry.indexOf(this)<0){registry.push(this)}}},{key:"_unregisterInstance",value:function _unregisterInstance(){var index=registry.indexOf(this);if(index!=-1)registry.splice(index,1)}}]);return IntersectionObserver}();var IntersectionObserver=window.IntersectionObserver;if("IntersectionObserver"in window&&"IntersectionObserverEntry"in window&&"intersectionRatio"in IntersectionObserverEntry.prototype){if(!("isIntersecting"in IntersectionObserverEntry.prototype)){Object.defineProperty(IntersectionObserverEntry.prototype,"isIntersecting",{get:function get(){return this.intersectionRatio>0}})}}else{IntersectionObserver=IntersectionObserver$2}var IntersectionObserver$1=IntersectionObserver;return IntersectionObserver$1});(function(){var cssText=""+'@charset "utf-8";.progress-images{position:relative;max-width:100%;margin:auto}.progress-images--placeholder{width:100%;height:0}.progress-images--canvas{position:absolute;left:0;top:0;width:100%;opacity:1;visibility:visible;transition:visibility 0s linear .5s,opacity .1s .4s}.progress-images--original{position:absolute;left:0;top:0;width:100%;visibility:hidden;opacity:0;transition:visibility 0s linear 0s,opacity .4s 0s}';var styleEl=document.createElement("style");document.getElementsByTagName("head")[0].appendChild(styleEl);if(styleEl.styleSheet){if(!styleEl.styleSheet.disabled){styleEl.styleSheet.cssText=cssText}}else{try{styleEl.innerHTML=cssText}catch(e){styleEl.innerText=cssText}}})();window.addEventListener("load",function(undefined){var isMediumEffect=true;var $images=document.querySelectorAll("img[data-original]");var observer=new IntersectionObserver(onIntersection);$images.forEach(function($image){observer.observe($image);setTimeout(function(){fixFancybox($image)});if(isMediumEffect){canvasEffectInit($image)}});function onIntersection(entries){entries.forEach(function(entry){if(entry.intersectionRatio>0){observer.unobserve(entry.target);preloadImage(entry.target)}})}function preloadImage(target){var src=target.getAttribute("data-original");if(!src){return false}var $img=new Image;target.style.opacity="0";$img.onload=function(){var nextNode=target.nextSibling;target.setAttribute("src",src);target.style.opacity="1";target.style.visibility="visible";if(nextNode.nodeName.toLowerCase()==="canvas"){nextNode.style.opacity="0";nextNode.style.visibility="hidden"}$img.onload=null;$img=null};$img.src=src}function fixFancybox(el){var $parent=el.parentNode;if(el.parentNode.className.indexOf("fancybox")!==-1){var src=el.getAttribute("data-original");$parent.setAttribute("href",src)}}function canvasEffectInit($el){var canvas=document.createElement("canvas");var ctx=canvas.getContext("2d");var imageThumb=new Image;imageThumb.onload=function(){var sx=0;var sy=0;var x=0;var y=0;var swidth=imageThumb.width;var sheight=imageThumb.height;var $parent=$el.parentNode;canvas.width=swidth;canvas.height=sheight;canvas.setAttribute("class","progress-images--canvas");ctx.filter="blur(3px)";ctx.drawImage(imageThumb,sx,sy,swidth,sheight,x,y,swidth,sheight);$parent.appendChild(canvas);imageThumb.onload=null;imageThumb=null};imageThumb.src=$el.getAttribute("data-thumb")}});