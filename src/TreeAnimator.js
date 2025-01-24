import * as THREE from 'three';

export default class TreeAnimator{

    constructor(){
        this.skeletonArray = [];
    }

    // --- 

    animateTrees(windDirection, windStrength, time){
        
        if(this.skeletonArray.length == 0) return;

        windStrength = windStrength / 100; 

        // --- 
      
        this.skeletonArray.forEach((skeleton) => {
            skeleton.forEach((boneObj, index) => {
    
                const branchFlexibility = 1.0;
                const radiusInfluence = (1 / (boneObj.radius + 1)) * branchFlexibility; // Smaller radius = larger influence
                const swayDelay = index * 0.1;
        
                // Circular sway using sine and cosine
                const swayX = windDirection.x * windStrength * radiusInfluence * Math.sin(time + swayDelay);
                const swayZ = windDirection.z * windStrength * radiusInfluence * Math.cos(time + swayDelay);
        
                boneObj.bone.rotation.x = swayX;
                boneObj.bone.rotation.z = swayZ;
    
            })
        })
    }   

}