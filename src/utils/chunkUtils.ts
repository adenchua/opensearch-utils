export default function chunkArray(list: object[], chunkSize: number) {
  const result = [...Array(Math.ceil(list.length / chunkSize))].map(() =>
    list.splice(0, chunkSize),
  );
  return result;
}
