"use strict";(self.webpackChunkweb=self.webpackChunkweb||[]).push([["95957"],{109328(e,n,r){r.d(n,{o:()=>Markdown});var t=r(831085),i=r(514041),o=r(175591),a=r(721173),s=r(570280),d=r(258946);function hasParents(e,n){return e.findIndex(e=>e.type===n)>-1}let l={h:"$5"},p={heading1:(e,n)=>(0,t.jsx)(d.BJ,{mt:"$9",children:n},e.key),heading2:(e,n)=>(0,t.jsx)(d.BJ,{pt:"$7",children:n},e.key),heading3:(e,n)=>(0,t.jsx)(d.BJ,{pt:"$5",children:n},e.key),text:(e,n,r,i,o={})=>(0,t.jsx)(s.y,{...i.text,...o,children:e.content},e.key),textgroup:(e,n,r,i)=>(0,t.jsx)(s.y,{...i.text,children:n},e.key),bullet_list:(e,n)=>(0,t.jsx)(d.Se,{gap:"$2",pt:"$2",children:n}),list_item:(e,n,r)=>{if(hasParents(r,"bullet_list"))return(0,t.jsxs)(d.lW,{gap:"$2",children:[(0,t.jsx)(d.BJ,{ai:"center",jc:"center",w:"$4.5",h:"$6",$gtMd:l,children:(0,t.jsx)(d.BJ,{bg:"$textDisabled",w:5,h:5,borderRadius:"$full"})}),(0,t.jsx)(d.BJ,{flexShrink:1,children:n})]},e.key);if(hasParents(r,"ordered_list")){let i,o=r.findIndex(e=>"ordered_list"===e.type),a=r[o];return i=a.attributes&&a.attributes.start?a.attributes.start+e.index:e.index+1,(0,t.jsxs)(d.BJ,{children:[(0,t.jsxs)(s.y,{size:"$bodyLg",children:[i,e.markup]}),(0,t.jsx)(d.BJ,{children:n})]},e.key)}return(0,t.jsx)(d.BJ,{children:n},e.key)}};function Markdown({children:e}){let{gtMd:n}=(0,a.Qf)(),r=(0,i.useMemo)(()=>({heading1:{color:"$text",size:"$headingXl"},heading2:{color:"$text",size:"$headingLg"},heading3:{color:"$text",size:"$headingMd",fontWeight:"600"},text:{color:"$text",size:n?"$bodyMd":"$bodyLg"}}),[n]);return(0,t.jsx)(o.Ay,{rules:p,style:r,"data-sentry-element":"RNMarkdown","data-sentry-component":"Markdown","data-sentry-source-file":"/home/runner/work/app-monorepo/app-monorepo/packages/components/src/content/Markdown/index.tsx",children:e})}},767572(e,n,r){r.r(n),r.d(n,{default:()=>__rspack_default_export});var t=r(831085),i=r(109328),o=r(631319);let a=`
# Heading1

## Heading2

### ✨ New Features
- *Don’t forget your passphrase!*
- **Don’t forget your passphrase!**
- Support for Manta, Neurai, and Nervos networks.
- Support for LNURL Auth authorization signing.
- Ability to view firmware version in device information.
- New precision display under the Celestia network.

### 🐞 Bug Fixes
* Fixed incorrect display of recipient addresses during transfers on Near and Tron networks.
* Fixed overlapping transaction data display in Thorswap routing.
* Fixed incomplete display of signing information on the Sui network.

### 💎 Improvements
- Optimized packet handling logic for signing data on the Sui network.
- Increased blind signature message length to 4096 on the Polkadot network.

### 📝 Markdown Ordered List
1. Fixed incorrect display of recipient addresses during transfers on Near and Tron networks.
1. Fixed overlapping transaction data display in Thorswap routing.
1. Fixed incomplete display of signing information on the Sui network.

### 💡 Markdown UnOrdered List 1
- [ ] Fixed incorrect display of recipient addresses during transfers on Near and Tron networks.
- [ ] Fixed overlapping transaction data display in Thorswap routing.
- [ ] Fixed incomplete display of signing information on the Sui network.

### 💡 Markdown UnOrdered List 2
- Fixed incorrect display of recipient addresses during transfers on Near and Tron networks.
- Fixed overlapping transaction data display in Thorswap routing.
- Fixed incomplete display of signing information on the Sui network.

### 💡 Markdown UnOrdered List 3
* Fixed incorrect display of recipient addresses during transfers on Near and Tron networks.
* Fixed overlapping transaction data display in Thorswap routing.
* Fixed incomplete display of signing information on the Sui network.


`,__rspack_default_export=()=>(0,t.jsx)(o.P,{getFilePath:()=>"__CURRENT_FILE_PATH__--not-available-in-production",componentName:"Markdown",elements:[{title:"default",element:(0,t.jsx)(i.o,{children:a})}],"data-sentry-element":"Layout","data-sentry-component":"MarkdownGallery","data-sentry-source-file":"/home/runner/work/app-monorepo/app-monorepo/packages/kit/src/views/Developer/pages/Gallery/Components/stories/Markdown.tsx"})}}]);
//# sourceMappingURL=95957.1a1bb298ab.chunk.js.map