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
    console.warn('3 -> readXmlFile()', filename)
    if (!filename) {
      console.log('filename is null')
      return null
    }

    const data = await zip.file(filename).async('string')
    const parsed = txml.parse(data)
    const simplified = simplifyLostLess(parsed)
    console.warn('simplified=', simplified)

    // todo：txml不一致，如果Target有/ppt/，则需要去掉它，其它的添加../
    const Relationship = simplified?.Relationships?.Relationship
    let result
    if (Relationship) {
      if (Array.isArray(Relationship)) {
        result = Relationship.map(item => {
          let target = item?.attrs?.Target
          // console.warn('Array: target=', target)
          if (target) {
            target = formatTarget(target)
            // console.warn('After: target=', target)
            return {
              ...item,
              attrs: { ...item.attrs, Target: target },
            }
          }
          return item
        })
        // console.log('result=', result)
        return {
          ...simplified,
          Relationships: {
            Relationship: result,
          }
        }
      }
      else if (typeof Relationship === 'object') {
        let target = Relationship?.attrs?.Target
        // console.warn('Object: target=', target)
        if (target) {
          target = formatTarget(target)
          // console.warn('After: target=', target)
          return {
            Relationships: {
              Relationship: {
                attrs: {...Relationship.attrs, Target: target }
              }
            }
          }
        }
      }
    }
    return simplified
  }
  catch (e) {
    console.error('Error reading XML file:', e)
    return null
  }
}

function formatTarget(target) {
  if (target.includes('/ppt')) {
    target = target.replace(/^\/ppt\//, '')
  }

  const Types = ['slideLayouts', 'media', 'slideMasters']
  const flag = Types.some(type => target.includes(type))

  if (!target.startsWith('../') && flag) {
    target = `../${target}`
  }
  return target
}
