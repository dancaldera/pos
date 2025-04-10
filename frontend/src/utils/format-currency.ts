export const formatCurrency = (amount: number) => {
    return `$${amount as number}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
