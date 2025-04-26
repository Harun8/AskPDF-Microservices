function modelChooser(plan: string | null): string {
    let modelChooser: string | null = "gpt-4-0125-preview";
    // change to a switch case when u see this
    if (plan == null) {
      // free plan
      modelChooser = "gpt-4-0125-preview"; // 1 pdf upload 
    } else if (
      plan === "price_1OpYyoBzVPtG7eO2xJAtCiFa" ||
      plan === "price_1OpYlBBzVPtG7eO2D4il1zcz"
    ) {
      // premium
      modelChooser = "gpt-4-0125-preview"; // 50 pdf uploads
    } else if (
      plan === "price_1OpYzEBzVPtG7eO2xS53tGQ0" ||
      plan === "price_1OpYzuBzVPtG7eO2oCFa8Sc7"
    ) {
      // ultimate plan
      modelChooser = "gpt-4o-mini"; // 100 pdf uploads
    }
  
    return modelChooser;
  }
  
  export { modelChooser };
  