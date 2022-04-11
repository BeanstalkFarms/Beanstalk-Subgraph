export function apyMatrix(c: number, s: number, n: number) {
    let bigRoot = Math.sqrt(c*(1+1250*c))
    let r2 = Math.sqrt(2)
    let bigRoot2 = r2*bigRoot
    let v00 = -50*(50*c+bigRoot2)
    let v01 = 50*(-50*c+bigRoot2)

    let vic = 1/(200*bigRoot)
    let vi01 = vic * -100*(25*r2*c-bigRoot)
    let vi11 = vic * 100*(25*r2*c+bigRoot)
    let vi = [
        [vic*-r2, vi01],
        [vic*r2, vi11]
    ]

    bigRoot = Math.sqrt(2*(c+1250*c**2))
    let d00 = 1/100 * (-bigRoot + 50*c + 100)
    let d11 = 1/100 * (bigRoot + 50*c + 100)
    d00 = d00 ** n
    d11 = d11 ** n

    let vd = [
        [v00*d00, v01*d11],
        [d00, d11]
    ]

    let vdvi = [
        [vd[0][0]*vi[0][0]+vd[0][1]*vi[1][0], vd[0][0]*vi[0][1]+vd[0][1]*vi[1][1]],
        [vd[1][0]*vi[0][0]+vd[1][1]*vi[1][0], vd[1][0]*vi[0][1]+vd[1][1]*vi[1][1]]
    ]

    b = vdvi[0][0] * s/2 + vdvi[0][1] - (s == 4 ? 1 : 0)
    return b
}

console.log(apyMatrix(0.0001, 4, 365*24))