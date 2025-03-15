import * as txml from 'txml/dist/txml.mjs'

let cust_attr_order = 0

export function simplifyLostLess(children, parentAttributes = {}) {
  const out = {}
  if (!children.length) return out

  if (children.length === 1 && typeof children[0] === 'string') {
    return Object.keys(parentAttributes).length ? {
      attrs: { order: cust_attr_order++, ...parentAttributes },
      value: children[0],
    } : children[0]
  }
  for (const child of children) {
    if (typeof child !== 'object') return
    if (child.tagName === '?xml') continue

    if (!out[child.tagName]) out[child.tagName] = []

    const kids = simplifyLostLess(child.children || [], child.attributes)

    if (typeof kids === 'object') {
      if (!kids.attrs) kids.attrs = { order: cust_attr_order++ }
      else kids.attrs.order = cust_attr_order++
    }
    if (Object.keys(child.attributes || {}).length) {
      kids.attrs = { ...kids.attrs, ...child.attributes }
    }
    out[child.tagName].push(kids)
  }
  for (const child in out) {
    if (out[child].length === 1) out[child] = out[child][0]
  }

  return out
}

export async function readXmlFile(zip, filename) {
  try {
    console.warn('readXmlFile', filename)
    const data = await zip.file(filename).async('string')
    const parsed = txml.parse(data)
    const simplified = simplifyLostLess(parsed)
    console.log('data=', data, 'parsed=', parsed, 'simplified=', simplified)
    return simplified
  }
  catch(e) {
    console.error('Error reading XML file:', JSON.stringifye)
    return null
  }
}