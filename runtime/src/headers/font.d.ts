declare namespace ig {
  namespace MultiFont {
    interface MappingSimple {
      [iconName: string]: number;
    }
  }
  interface MultiFont {
    pushIconSet(this: this, font: ig.Font, mapping?: MultiFont.MappingSimple | null): void;
    setIconSet(
      this: this,
      iconSet: ig.Font,
      index: number,
      mapping?: MultiFont.MappingSimple | null,
    ): void;
  }
}
