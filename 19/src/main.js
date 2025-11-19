import { renderModel } from './renderModel.js'
import { Jimp } from 'jimp'

const parametersImage = {
	imageWidth: 1000,
	imageHeight: 1000,
	color: 0xffffffff,
	outputPath: '../image/twoModel2.png',
}
const parametersModel_1 = {
	modelPath:
		'C:/Users/Slava/Desktop/Проекты/Графика/sources/12268_banjofrog_v1_L3.obj',
	texturePath: 'C:/Users/Slava/Desktop/Проекты/Графика/sources/kwakwa.jpg',
	// modelPath: 'C:/Users/Slava/Desktop/Проекты/model_1.obj',
	// texturePath:
	// 	'C:/Users/Slava/Desktop/Проекты/Графика/17-18/src/Task_18/bunny-atlas.jpg',
	scaleX: 200,
	scaleY: -200,
	lightDirection: [0, 0, 1],
	rotate: {
		type: 'euler',
		angle: [130, 15, 140],
		units: 'degree',
	},
	moving: [0, 0, 7.5],
}

const parametersModel_2 = {
	modelPath: 'C:/Users/Slava/Desktop/Проекты/Графика/sources/model_1.obj',
	texturePath: 'C:/Users/Slava/Desktop/Проекты/Графика/sources/bunny-atlas.jpg',
	scaleX: 4000,
	scaleY: -4000,
	lightDirection: [0, 0, 1],
	rotate: {
		type: 'quat',
		angle: [0, 1, 0.1, 0],
		units: 'radians',
	},
	moving: [0.04, 0.04, 1],
}

const image = new Jimp({
	width: parametersImage.imageWidth,
	height: parametersImage.imageHeight,
	color: parametersImage.color,
})

const zBuffer = []
for (let i = 0; i < parametersImage.imageWidth; i++) {
	zBuffer[i] = new Array(parametersImage.imageHeight).fill(Infinity)
}
try {
	await renderModel(parametersModel_1, image, zBuffer)
	await renderModel(parametersModel_2, image, zBuffer)
	await image.write(parametersImage.outputPath)
} catch (error) {
	console.warn(error)
}
