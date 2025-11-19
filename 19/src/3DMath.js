export function barycentricCoordinates(x, y, x0, y0, x1, y1, x2, y2) {
	const lambda0 =
		((x - x2) * (y1 - y2) - (x1 - x2) * (y - y2)) /
		((x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2))
	const lambda1 =
		((x0 - x2) * (y - y2) - (x - x2) * (y0 - y2)) /
		((x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2))
	const lambda2 = 1.0 - lambda0 - lambda1
	return { lambda0, lambda1, lambda2 }
}

export function vertexRendering(
	zBuffer,
	image,
	textures,
	width,
	height,
	x0,
	y0,
	z0,
	I0,
	u0,
	v0,
	x1,
	y1,
	z1,
	I1,
	u1,
	v1,
	x2,
	y2,
	z2,
	I2,
	u2,
	v2,
	textureState = true
) {
	if (Math.abs((x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2)) < 0.0000000001) {
		return
	}
	const xmin = Math.max(0, Math.floor(Math.min(x0, x1, x2)) - 4)
	const xmax = Math.min(width, Math.ceil(Math.max(x0, x1, x2)) + 4)
	const ymin = Math.max(0, Math.floor(Math.min(y0, y1, y2)) - 4)
	const ymax = Math.min(height, Math.ceil(Math.max(y0, y1, y2)) + 4)
	for (let countX = xmin; countX <= xmax; countX++) {
		for (let countY = ymin; countY <= ymax; countY++) {
			if (countX < 0 || countX >= width || countY < 0 || countY >= height) {
				continue
			}
			const result = barycentricCoordinates(
				countX + 0.5,
				countY + 0.5,
				x0,
				y0,
				x1,
				y1,
				x2,
				y2
			)
			if (
				result != undefined &&
				result.lambda0 >= -0.005 &&
				result.lambda1 >= -0.005 &&
				result.lambda2 >= -0.005
			) {
				let I = -(
					result.lambda0 * I0 +
					result.lambda1 * I1 +
					result.lambda2 * I2
				)
				I = Math.max(0, Math.min(1, I)) //защита от очень ярких или очень темных участков, делим на 255 для попадания в отрезок [0,1] для получения коэффициента яркости
				let r, g, b
				let finalColor
				if (textureState) {
					let textureX = Math.round(
						(textures.width - 1) *
							(result.lambda0 * u0 + result.lambda1 * u1 + result.lambda2 * u2)
					)
					let textureY = Math.round(
						(textures.height - 1) *
							(result.lambda0 * v0 + result.lambda1 * v1 + result.lambda2 * v2)
					)

					const textureColor = textures.getPixelColor(textureX, textureY)
					let r = (textureColor >> 24) & 0xff
					let g = (textureColor >> 16) & 0xff
					let b = (textureColor >> 8) & 0xff
					r = Math.min(255, Math.floor(r * I))
					g = Math.min(255, Math.floor(g * I))
					b = Math.min(255, Math.floor(b * I))
					finalColor = ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0
				} else {
					r = 255
					g = 255
					b = 255
					finalColor = ((r * I) << 24) | ((g * I) << 16) | ((b * I) << 8) | 0xff
					finalColor = finalColor >>> 0
				}

				const z =
					result.lambda0 * z0 + result.lambda1 * z1 + result.lambda2 * z2

				if (
					z < zBuffer[countX][countY] &&
					countX >= 0 &&
					countX < width &&
					countY >= 0 &&
					countY < height
				) {
					image.setPixelColor(
						finalColor,
						Math.round(countX),
						Math.round(countY)
					)
					zBuffer[countX][countY] = z
				}
			}
		}
	}
}
export function calculatingTheNormal(x0, y0, z0, x1, y1, z1, x2, y2, z2) {
	const normalX = (y1 - y2) * (z1 - z0) - (z1 - z2) * (y1 - y0)
	const normalY = (z1 - z2) * (x1 - x0) - (x1 - x2) * (z1 - z0)
	const normalZ = (x1 - x2) * (y1 - y0) - (y1 - y2) * (x1 - x0)
	return { normalX, normalY, normalZ }
}

export function calculatingTheCos(x, y, z, l) {
	if (
		Math.sqrt(x ** 2 + y ** 2 + z ** 2) === 0 &&
		Math.sqrt(l[0] ** 2 + l[1] ** 2 + l[2] ** 2) === 0
	)
		return 0
	const cos =
		(x * l[0] + y * l[1] + z * l[2]) /
		(Math.sqrt(x ** 2 + y ** 2 + z ** 2) *
			Math.sqrt(l[0] ** 2 + l[1] ** 2 + l[2] ** 2))
	return cos
}
export function rotate(
	x,
	y,
	z,
	type = 'euler',
	rotationParams = [0, 0, 0],
	unitsOfRotation = 'radians'
) {
	let angles = [...rotationParams] // во избежание мутации исходного parameters.rotate.angle
	if (type === 'euler' && unitsOfRotation === 'degree') {
		for (let i = 0; i < angles.length; i++) {
			angles[i] *= Math.PI / 180
		}
	} else if (type === 'quat') {
		angles = eulFromQuat(angles)
	}
	const [alpha, beta, gamma] = angles
	const Rx = [
		[1, 0, 0],
		[0, Math.cos(alpha), Math.sin(alpha)],
		[0, -Math.sin(alpha), Math.cos(alpha)],
	]
	const Ry = [
		[Math.cos(beta), 0, Math.sin(beta)],
		[0, 1, 0],
		[-Math.sin(beta), 0, Math.cos(beta)],
	]
	const Rz = [
		[Math.cos(gamma), Math.sin(gamma), 0],
		[-Math.sin(gamma), Math.cos(gamma), 0],
		[0, 0, 1],
	]
	const Rxy = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
	]
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			let result = 0
			for (let k = 0; k < 3; k++) {
				const a = Rx[j][k] * Ry[k][i]
				result += a
			}
			Rxy[j][i] = result
		}
	}
	const Rxyz = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
	]
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			let result = 0
			for (let k = 0; k < 3; k++) {
				const a = Rxy[j][k] * Rz[k][i]
				result += a
			}
			Rxyz[j][i] = result
		}
	}
	const xNew = Rxyz[0][0] * x + Rxyz[0][1] * y + Rxyz[0][2] * z
	const yNew = Rxyz[1][0] * x + Rxyz[1][1] * y + Rxyz[1][2] * z
	const zNew = Rxyz[2][0] * x + Rxyz[2][1] * y + Rxyz[2][2] * z
	return { x: xNew, y: yNew, z: zNew }
}
function eulFromQuat(rotate) {
	const normalizedQuat =
		rotate[0] * rotate[0] +
		rotate[1] * rotate[1] +
		rotate[2] * rotate[2] +
		rotate[3] * rotate[3]
	const s = normalizedQuat > 0 ? 2 / normalizedQuat : 0
	const xs = rotate[0] * s,
		ys = rotate[1] * s,
		zs = rotate[2] * s
	const wx = rotate[3] * xs,
		wy = rotate[3] * ys,
		wz = rotate[3] * zs
	const xx = rotate[0] * xs,
		xy = rotate[0] * ys,
		xz = rotate[0] * zs
	const yy = rotate[1] * ys,
		yz = rotate[1] * zs,
		zz = rotate[2] * zs
	const matrix = [
		[1 - (yy + zz), xy - wz, xz + wy],
		[xy + wz, 1 - (xx + zz), yz - wx],
		[xz - wy, yz + wx, 1 - (xx + yy)],
	]
	return eulFromMatrix(matrix)
}

function eulFromMatrix(matrix) {
	const epsilon = 0.000002
	const cy = Math.sqrt(
		matrix[0][0] * matrix[0][0] + matrix[1][0] * matrix[1][0]
	)
	let alpha, beta, gamma
	if (cy > 16 * epsilon) {
		gamma = Math.atan2(matrix[2][1], matrix[2][2])
		beta = Math.atan2(-matrix[2][0], cy)
		alpha = Math.atan2(matrix[1][0], matrix[0][0])
	} else {
		gamma = Math.atan2(-matrix[1][2], matrix[1][1])
		beta = Math.atan2(-matrix[2][0], cy)
		alpha = 0
	}
	return [alpha, beta, gamma]
}
