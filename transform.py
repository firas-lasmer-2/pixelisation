import sys
import re

with open('src/pages/Studio.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = '<div className="flex-1 studio-bg">'
start_idx = text.find(start_marker)

end_match = re.search(r'\{/\*\s*═══════════════════════════════════════════\s*STEP 1: Choose Category', text)

if start_idx != -1 and end_match:
    end_idx = end_match.start()
    
    before = text[:start_idx]
    after = text[end_idx:]
    
    replacement = '''<div className="flex-1 flex flex-col lg:flex-row overflow-hidden studio-bg">
        
        {/* LEFT PANE: Sticky Visualizer */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative bg-muted/10 border-r flex-col items-center justify-center p-4 lg:p-8 overflow-hidden z-10 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative w-full h-full flex flex-col items-center justify-center pt-8 lg:pt-0">
             {order.stylePreviewUrl ? (
                 <img src={order.stylePreviewUrl} className="max-h-full max-w-full object-contain rounded-xl shadow-2xl animate-fade-in" />
             ) : order.aiGeneratedUrl || photo ? (
                 <img src={order.aiGeneratedUrl || photo} className="max-h-full max-w-full object-contain rounded-xl shadow-xl animate-fade-in" />
             ) : (
                 <div className="w-64 h-80 border-2 border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center text-muted-foreground/50 bg-card/50">
                    <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                    <p className="font-medium text-center px-4">Votre création apparaîtra ici</p>
                 </div>
             )}
          </div>
        </div>

        {/* RIGHT PANE: Controls */}
        <div className="w-full lg:w-[55%] xl:w-[50%] h-full overflow-y-auto overflow-x-hidden scrollbar-hide relative pb-24 lg:pb-32 bg-card">
          
          {/* Header */}
          <div className="px-5 py-6 lg:px-10 lg:py-8 border-b bg-card/95 sticky top-0 z-20 backdrop-blur-xl">
             <div className="flex items-center justify-between mb-4 mt-2">
               <div>
                 <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-1">Configuration</p>
                 <h1 className="text-2xl font-bold font-playfair tracking-tight">{CATEGORY_META[order.category]?.label || "Studio"}</h1>
               </div>
               {isAICategory && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    <Sparkles className="h-3 w-3" /> Assistant IA
                  </span>
               )}
             </div>
             <StepIndicator currentStep={step} totalSteps={totalSteps} stepMeta={stepMeta} onStepClick={(s) => goToStep(s)} />
          </div>

          <div className="p-5 lg:p-10 max-w-2xl mx-auto">
            <div key={animKey} className={slideClass}>

              '''

    new_text = before + replacement + after
    
    # Bottom replacement
    # We want to replace the last set of closing divs before <Footer />
    btm_match = re.search(r' {10}</div>\s*</div>\s*</div>\s*<Footer />', new_text)
    if btm_match:
        new_text = new_text[:btm_match.start()] + '          </div>\n        </div>\n      </div>\n\n      {/* Right pane scroll footer spacer */}\n      <div className="h-12"></div>\n' + new_text[btm_match.end() - len('<Footer />'):]
        
    with open('src/pages/Studio.tsx', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print('SUCCESS')
else:
    print('FAILED top find')
