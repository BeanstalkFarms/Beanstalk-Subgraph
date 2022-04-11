export function calculateAPYs(c: number, n: number): number[] {
    let vdvi = calculateVDVI(c,n)
    let beanAPY = vdvi[0] * 1 + vdvi[1]
    let lpAPY = vdvi[0] * 2 + vdvi[1] - 1
    return [beanAPY*100, lpAPY*100]
}

function calculateVDVI(c: number,n: number): number[] {
    let bigRoot = Math.sqrt(c*(1+1250*c))
    let r2 = Math.sqrt(2)
    let bigRoot2 = r2*bigRoot
    let v00 = -50*(50*c+bigRoot2)
    let v01 = 50*(-50*c+bigRoot2)

    let vic = 1/(200*bigRoot)
    let vi01 = vic * -100*(25*r2*c-bigRoot)
    let vi11 = vic * 100*(25*r2*c+bigRoot)
    let vi00 = vic*-r2
    let vi10 = vic*r2

    bigRoot = Math.sqrt(2*(c+1250*c**2))
    let num = -bigRoot + 50*c + 100
    let d00 = (-bigRoot + 50*c + 100)/100
    let d11 = (bigRoot + 50*c + 100)/100
    d00 = d00 ** n
    d11 = d11 ** n
    let vd0 = v00*d00
    let vd1 = v01*d11

    let vdvi1 = vd0*vi00+vd1*vi10
    let vdvi2 = vd0*vi01+vd1*vi11
    return [vd0*vi00+vd1*vi10, vd0*vi01+vd1*vi11]

}